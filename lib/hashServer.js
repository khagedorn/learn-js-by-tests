var loadContent = function($container, displayCallback){
	var completeUrl = window.location.href;
	var partBeforeAnchor = completeUrl.split('#')[0];
	var positionOfLastSlash = partBeforeAnchor.lastIndexOf('/');

	var baseUrl = partBeforeAnchor.substring(0, positionOfLastSlash + 1);
	
	var hash = window.location.hash;
	
	if(hash.startsWith('#!')){
		hash = hash.substring(2);
	} else {
		hash =  hash.substring(1);
	}
	
	var contentUrl = baseUrl + 'content/' + hash;
	
	$.ajax({
		url: contentUrl,
		dataType: 'text'
	}).always(function(){
		$container.empty();
	}).done(function(data){
		displayCallback(data, $container);
	}).fail(function(status, statusText, error){
		$container.append($('<div class="Error">' + completeUrl + ' could not be loaded: '+ status.status + ' ' + status.statusText + '</div>'));
	});
}
		
AnchorContentServer = {
	run: function($container, displayCallback){
		var reloadContent = function(){
			loadContent($container, displayCallback);
		}
		
		window.onhashchange = reloadContent;
		
		window.onload = function(){	
			if(!window.location.hash){
				window.location.hash='!home';
			} else {
				reloadContent();
			}
		}
	}
}