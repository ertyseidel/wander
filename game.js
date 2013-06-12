var currentUser = null;
var otherUsers = {}
var context = false;
var keys = {
	87: false,
	38: false,
	65: false,
	37: false,
	83: false,
	40: false,
	68: false,
	39: false
};
var loadingLoop = null;
//Set up window animation request frame (x-browser compatibility)
(function() {
  var requestAnimationFrame = window.requestAnimationFrame || window.mozRequestAnimationFrame ||
							  window.webkitRequestAnimationFrame || window.msRequestAnimationFrame;
  window.requestAnimationFrame = requestAnimationFrame;
})();

function upKeyHandler(evt){
	evt = evt || window.event;
	console.log(evt);
	delete keys[evt.keyCode];
}


window.onload = function(){
	//Set up the user object and make sure it is current and valid
	var userData = retrieveUserCookieData();
	if(typeof(userData) == 'undefined'){
		console.log("Getting new user data");
		GET('/createuser', function(userData){
			userData = JSON.parse(userData);
			document.cookie = "user=" + encodeURIComponent(JSON.stringify(userData));
			currentUser = userData;
		});
	} else{
		GET('/checkuser/' + userData.id, function(checkUserData){
			checkUserData = JSON.parse(checkUserData);
			if(checkUserData.status == 'false'){
				GET('/createuser', function(newUserData){
					newUserData = JSON.parse(newUserData);
					document.cookie = "user=" + encodeURIComponent(JSON.stringify(newUserData));
					currentUser = newUserData;
				});
			} else{
				currentUser = userData;
			}
		});
	}
	//Set up and start the actual game loop
	var canvas = document.getElementById("canvas");
	context = canvas.getContext("2d");
	window.onkeydown = function(evt){
		evt = evt || window.event;
		keys[evt.keyCode] = true;
	};
	window.onkeyup = function(evt){
		evt = evt || window.event;
		keys[evt.keyCode] = false;
	};
	loadingLoop = setInterval(function(){
		if(typeof(currentUser) != 'boolean'){
			clearInterval(loadingLoop);
			setInterval(updateLoop, 250);
			requestAnimationFrame(localLoop);
		}
	}, 100);
}

function localLoop(){
	//update location
	if(keys[87] || keys[38]){
		currentUser.y --;
	}
	if(keys[65] || keys[37]){
		currentUser.x --;
	}
	if(keys[83] || keys[40]){
		currentUser.y ++;
	}
	if(keys[68] || keys[39]){
		currentUser.x ++;
	}
	//draw
	context.fillStyle="#000000";
	context.fillRect(0, 0, 800, 600);
	context.fillStyle="#ffffff";
	context.fillRect(currentUser.x - currentUser.viewDist, currentUser.y - currentUser.viewDist, currentUser.viewDist * 2, currentUser.viewDist * 2);
	context.fillStyle="#FF0000";
	for(var key in otherUsers){
		if(otherUsers[key].id == currentUser.id){
			//Check illegal movement
		} else {
			var p = otherUsers[key];
			context.fillRect(p.x - 5, p.y - 5, 10, 10);
		}
	}
	context.fillStyle="#000000";
	context.fillRect(currentUser.x - 5, currentUser.y - 5, 10, 10);
	requestAnimationFrame(localLoop);
}

function updateLoop(){
	GET('loop/' + currentUser.id + "/" + currentUser.x + "/" + currentUser.y, function(data){
		otherUsers = JSON.parse(data);
	});
}

function retrieveUserCookieData(){
	allCookies = document.cookie;
	allCookies = document.cookie.split(";");
	for(var i = 0; i < allCookies.length; i++){
		var cook = allCookies[i].split("=");
		if(cook[0].trim() == 'user'){
			return JSON.parse(decodeURIComponent(cook[1]));
		}
	}
}

function GET(url, callback){
	var oReq = new XMLHttpRequest();
	oReq.onload = function(){callback.apply(this, [this.responseText])};
	oReq.open("get", url, true);
	oReq.send();
}