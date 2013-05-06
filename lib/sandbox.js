Sandbox = {
	configuration: {
		neededImports: ['lib/expect.js']
	},
	create: function(callback){
		createIframe(function(iframe){
			sandbox = createSandbox(iframe);
			callback(sandbox);
		});
	},
	run: function(codeFragments, callback){
		if(!Array.isArray(codeFragments)){
			codeFragments = [codeFragments];
		}
	
		this.create(function(sandbox){
			try {
				var result = sandbox.run(codeFragments);	
				callback(null, result);
			} catch (error){
				callback(error);
			}	finally {
				sandbox.destroy();
			} 
		});
	}
}

var createSandbox = function(iframe){
	return {
		iframe: iframe,
		
		run: function(codeFragments){
			var resultOfLastFragment = undefined;
			
			for (var codeFragmentIndex in codeFragments){
				var codeFragment = codeFragments[codeFragmentIndex];
				resultOfLastFragment = this.runFragment(codeFragment);
			}
			return resultOfLastFragment;
		},
		
		runFragment: function(codeFragment){
			log('running: ' + codeFragment);
			
			try {
				var result = this.evaluate(codeFragment);
				log(' -> ' + result);
				return result;
			} catch (error){
				log(' -x-> ' + error);
				throw error;
			}
		},
		
		evaluate: function(code){
			return this.iframe.contentWindow.eval(code);
		},
		
		destroy: function (){
			document.body.removeChild(iframe);
		}
	}
}

var createIframe = function(callback){
	var iframe = document.createElement('iframe');
	iframe.setAttribute('id', 'js_sandbox');
	iframe.setAttribute('src', 'about:blank');
	iframe.setAttribute('style', 'visibility:hidden');
	document.body.appendChild(iframe);
	
	var iframeDocument = iframe.contentWindow.document;
	
	var monitor = Concurrency.monitors.create();
	
	var neededImports = Sandbox.configuration.neededImports;
	neededImports.map(function(importedJs){
		log('importing: ' + importedJs);
		iframeDocument.write('<script type="text/javascript" src="' + importedJs + '"></script>');		
	});
	
	iframeDocument.write('<script type="text/javascript">parent.Concurrency.release(' + monitor.id + ');</script>');
	
	monitor.waitUntilReleased(function(){	
		callback(iframe);
	});
}

var log = function(message){
	if(false)
		console.log('\t[sb]: ' + message)
}