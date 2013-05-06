var parseableText = function(text){
	var lines = text.split('\n');
	return {
		lines: lines,
		currentLineNumber: 0,
		currentLine: lines[0],
		advanceToNextLine: function(){
			this.currentLineNumber++;
			this.currentLine = this.lines[this.currentLineNumber];
		},
		isCompletelyRead: function(){
			return this.currentLineNumber >= this.lines.length;
		}
	}
}

var tabIndentedBlock = function(labelText, createElementFunction){
	return {
		labelText: labelText,
		startsAt: function(line){
			return line.startsWith(this.labelText + ':');
		},
		isFinishedAt: function(line){
			return (typeof line === "undefined") || !line.startsWith('\t');
		},
		parseFrom: function(text, exercise){
			var header = this.parseHeader(text)
			text.advanceToNextLine();
			
			var bodyText = this.parseBody(text);
			this.createElement(header, bodyText, exercise);
		},
		parseHeader: function(text){
			var line = text.currentLine;
			var textAfterLabel = line.substring((labelText + 1).length).trim();
			return textAfterLabel;
		},
		parseBody: function(text){
			var bodyText = '';
			while(!this.isFinishedAt(text.currentLine)){
				if(bodyText.length !== 0){
					bodyText += '\n';
				}
				
				var lineWithoutTab = text.currentLine.substring(1);
				bodyText += lineWithoutTab;
				
				text.advanceToNextLine();
			}
			
			return bodyText;
		},
		createElement: createElementFunction
	}
}

var specialBlocks = [
	tabIndentedBlock('startCode', function(head, body, exercise){
		exercise.startCode = body;
	}),
	tabIndentedBlock('test', function(head, body, exercise){
		exercise.tests.push(test(head, body));
	})
];

var finishTextBlock = function(currentTextBlock, exercise){
	var content = currentTextBlock.trim();
	if (content.isEmpty()){
		return;
	}
	
	exercise.tests.push(createTextElement(content));
}

Exercise = {
	parseFrom: function (text){
		var parsedText = parseableText(text);
		var exercise = this.create();
		
		var currentTextBlock = '';
		while(!parsedText.isCompletelyRead()){
			var line = parsedText.currentLine;
			var matchingSpecialBlock = null;
			specialBlocks.map(function(block){
				if(block.startsAt(line)){
					matchingSpecialBlock = block;
				}
			});
			log('matches: ' + (matchingSpecialBlock ? matchingSpecialBlock.labelText : 'nothing'));
			
			if(matchingSpecialBlock){
				finishTextBlock(currentTextBlock, exercise);
				currentTextBlock = '';
				matchingSpecialBlock.parseFrom(parsedText, exercise);
			} else {
				currentTextBlock += line + '\n';
				parsedText.advanceToNextLine();
			}
		}
		finishTextBlock(currentTextBlock, exercise);
		
		return exercise;
	},
	create: function(startCode, tests){
		return {
			startCode: startCode || '',
			tests: tests || [],
			testElements: [],
			display: function($parent){
				this.htmlElement = $parent;
				var thisExercise = this;
				
				this.tests.map(function(test){
					test.display(thisExercise);
				});
				
				this.editor = createEditor(this);
				this.run();
			},
			run: function(){
				var code = this.editor.getValue();
				join = Concurrency.createJoin();
				
				this.testElements.map(function(testElement){
					var monitor = join.createMonitor();
					testElement.run(code, function(){
						monitor.release();
					});
				});
				
				var thisExercise = this;
				join.whenAllReleased(function(){
					var elementBeforeEditor = thisExercise.firstFailedOrLastElement();
					
					if(elementBeforeEditor){
						$('.codeEditor').insertAfter(
							elementBeforeEditor.htmlElement);
						if(elementBeforeEditor.typeOfLastRun === 'failure'){
							elementBeforeEditor.expand();
						}
						thisExercise.editor.focus();
					} else {
						$('.codeEditor').remove();
					}
				});
			},
			firstFailedOrLastElement: function(){
				var failedElements = this.testElements.filter(function(testElement){
					return testElement.typeOfLastRun === 'failure';
				});
				
				return failedElements.first() || this.testElements.last();
			}
		}
	}
}


var createEditor = function(exercise){
	var runButton = $('<input type="button" value="Run [Ctrl + RETURN]" />');
	runButton.click(function(){
		exercise.run();
	});
	
	var editorArea = $('<textarea id="code" style="min-width: 600px; min-height:250px" style="border:1px solid black"/>');
	
	var editorContainer = $('<div class="codeEditor"/>')
		.append($('<div class="codeContainer"/>')
			.append(editorArea)
		).append(runButton);
		
	exercise.htmlElement.append(editorContainer);
	
	var editor = CodeMirror.fromTextArea(editorArea[0], {mode: "javascript", autofocus: true});
	editor.setValue(exercise.startCode);
	
	document.onkeypress = function(event){
		if(event.ctrlKey && (event.which === 10 || event.which === 13)){
			exercise.run();
			event.stopPropagation();
			event.preventDefault();
		}
	}
	
	return editor;
}

text = createTextElement;

var createTextElement = function(content){
	return {
		content: content,
		display: function(exercise){
			var htmlContent = markdown.toHTML(this.content);
			exercise.htmlElement.append($('<div class="textNode">' + htmlContent + '</div>'));
		}
	}
}

test = function(description, code){
	return {
		description: description,
		code: code,
		run: function(codeUnderTest, callback){
			var that =  this;
			Sandbox.run([codeUnderTest, code], function(error, result){
				if(error != null && typeof(error) != 'undefined'){
					callback(TestResult.failure(that, error));
				} else {
					callback(TestResult.success(that));
				}
			});
		},
		display: function(exercise){
			var testElement = ResultElement.create(this, exercise.htmlElement);
				exercise.testElements.push(testElement);
		}
	}
}

TestResult = {
	success: function(test){
		
		return {
			type: 'success',
			test: test,
			wasSuccessful: true,
			toString: function(){
				return "Success: " + test.description;
			}
		}
	},
	failure: function(test, exception){
		return {
			type: 'failure',
			test: test,
			wasSuccessful: false,
			exception: exception,
			toString: function(){
				return "Failure: " + this.test.description + "\n"
					+ this.exception;
			}
		}
	}
};

ResultElement = {
	create: function(test, $parent){
		var expandButton = $('<div class="icon expandButton"/>');
		
		var codeElement = $('<pre class="brush: js">' + test.code.toString() + '</pre>');
		var content = $('<div class="content"/>')
			.append($('<div class="testCode"/>')
				.append(codeElement));
		
		var htmlElement = $('<div class="testResult"/>')
				.append($('<div class="header">')
					.append($('<div class="icon statusIcon"/>'))
					.append($('<h6>' + test.description + '</h6>'))
					.append(expandButton))
		
		htmlElement.append(content);
		$parent.append(htmlElement);
		SyntaxHighlighter.highlight(codeElement[0]);
		
		expandButton.click(function(){
			htmlElement.toggleClass('expanded');
		});
		
		return {
			htmlElement: htmlElement,
			contentElement: content,
			test: test,
			expand: function(){
				this.htmlElement.addClass('expanded')
			},
			collapse: function(){
				this.htmlElement.removeClass('expanded')
			},
			setType: function(type){
				htmlElement.removeClass('failure success running');
				this.htmlElement.addClass(type);
				this.typeOfLastRun = type
			},
			displayResult: function(result, shouldBeExpanded){
				var oldType = this.typeOfLastRun;

				this.setType(result.type);
				
				if (result.exception != undefined){
					this.contentElement.append('<div class="resultMessage">Test failed: ' + result.exception + '</div>');
				}
				
				if(oldType === 'failure' && result.type === 'success'){
					this.collapse();
				}
			},
			run: function(code, callback){
				this.htmlElement.addClass('running');
				$('.resultMessage', this.contentElement).remove();
				var that = this;				
				this.test.run(code, function(result){
					that.displayResult(result);
					htmlElement.removeClass('running');
					if(callback){
						callback(result);
					}
				});
			}
		};
	}
};