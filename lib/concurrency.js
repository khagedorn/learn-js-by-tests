Array.prototype.remove = function(objectToRemove){
	for(var index in this){
		var currentObject = this[index];
		if(currentObject === objectToRemove){
			this.splice(index, 1);
		}
	}
};

String.prototype.isEmpty = Array.prototype.isEmpty = function(){
	return this.length === 0;
}

if(!String.prototype.startsWith){
	String.prototype.startsWith = function(prefix){
		if (this.length < prefix.length){
			return false;
		}
		
		for(var index = 0; index < prefix.length; index++){
			if(this[index] !== prefix[index]){
				return false;
			}
		}
		
		return true;
	}
}



Array.prototype.last = function(){
	if(this.isEmpty()){
		return undefined;
	}
	
	return this[this.length - 1];
}

Array.prototype.first = function(){
	if(this.isEmpty()){
		return undefined;
	}
	
	return this[0];
}

Concurrency = {
	monitors: {
		create: function(){
			monitorId = createMonitorId();
			
			var monitor = {
				id: monitorId,
				status: 'waiting',
				waitUntilReleased: function (callback){
					if(this.status == 'released'){						
						delete Concurrency.monitors[this.id];
						callback();
					} else {
						var that = this;
						window.setTimeout(function(){
							that.waitUntilReleased(callback);
						}, 1);
					}
				},
				release: function() {
					this.status = 'released';
				}
			}
			this[monitorId] = monitor;
			
			return monitor;
		}
	},
	
	release: function(id){
		this.monitors[id].release();
	},
	
	createJoin: function(){
		return {
			monitors: [],
			createMonitor: function(){
				var thisMonitor = this;
				
				var monitor = {
					release: function(){
						thisMonitor.monitors.remove(this);
					}
				}

				thisMonitor.monitors.push(monitor);
				return monitor;
			},
			whenAllReleased: function(callback){
				if(this.monitors.isEmpty()){
					callback();
				} else {
					var thisMonitor = this;
					setTimeout(function(){
						thisMonitor.whenAllReleased(callback);
					}, 10);
				}
			}
		};
	}
}

var createMonitorId = function(){
	var id;
	
	do {
		id = Math.floor(Math.random() * 10000).toString();
	} while (id in Concurrency.monitors);
	
	return id;
}