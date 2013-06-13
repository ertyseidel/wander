
var currentUser = false;
var currentWorld = false;
var updateData = false;
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
var hasReturned = true;

var animations = {};
function Animation(id, text, size, x, y, color, duration){
	this.id = id;
	this.text = text;
	this.size = size;
	this.x = x;
	this.y = y;
	this.color = color;
	this.current = duration;
	this.duration = duration;
	this.drawFtn = function(context){
		context.font = "bold " + this.size + " Calibri";
		console.log(this.current / this.duration);
		context.fillStyle = toRGBA(this.color, this.current / this.duration);
		context.fillText(this.text, this.x, this.y);
		if(--this.current < 0){
			delete animations[this.id];
		}
	}
	animations[this.id] = this;
}

function toRGBA(color, opacity){
	color = color.substring(1); // strip "#";
	var r = parseInt(color.substring(0,2), 16);
	var g = parseInt(color.substring(2,2), 16);
	var b = parseInt(color.substring(4,2), 16);
	return "rgba(" + r + "," + g + "," + b + "," + opacity + ")";
}

//Set up window animation request frame (x-browser compatibility)
(function() {
	var requestAnimationFrame = window.requestAnimationFrame || window.mozRequestAnimationFrame || window.webkitRequestAnimationFrame || window.msRequestAnimationFrame;
 	window.requestAnimationFrame = requestAnimationFrame;
})();

window.onload = function(){
	//Set up the user object and make sure it is current and valid
	var userData = retrieveUserCookieData();
	if(typeof(userData) == 'undefined'){
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
			var welcome = new Animation("welcome", "Welcome!", 20, 30, 30, "#ff0000", 120);
			clearInterval(loadingLoop);
			updateIsIt();
			setInterval(updateLoop, 100);
			requestAnimationFrame(localLoop);
		}
	}, 100);
}

function localLoop(){
	if(typeof(updateData) != 'boolean'){
		if(typeof(currentWorld) == 'boolean') currentWorld = updateData.world;
		//set up world
		if(currentWorld.id != updateData.world.id){
			console.log("NEW GAME!")
			currentWorld = updateData.world;
		}
		//update location
		if(keys[87] || keys[38]){
			currentUser.y -= currentUser.speed;
		}
		if(keys[65] || keys[37]){
			currentUser.x -= currentUser.speed;
		}
		if(keys[83] || keys[40]){
			currentUser.y += currentUser.speed;
		}
		if(keys[68] || keys[39]){
			currentUser.x += currentUser.speed;
		}
		//draw
		context.fillStyle="#000000";
		context.fillRect(0, 0, currentWorld.width, currentWorld.height);
		context.fillStyle="#ffffff";
		context.fillRect(currentUser.x - currentUser.viewDist, currentUser.y - currentUser.viewDist, currentUser.viewDist * 2, currentUser.viewDist * 2);
		for(var key in updateData.players){		
			if(updateData.players[key].id == currentUser.id){
				if(currentUser.isIt != updateData.players[key].isIt){
					updateIsIt(updateData.players[key].isIt);
				}
			} else {
				var p = updateData.players[key];
				context.fillStyle= p.isIt ? "#FF0000" : "#00FF00";
				context.fillRect(p.x - 5, p.y - 5, 10, 10);
			}
		}
		context.fillStyle = currentUser.isIt ? "#550000" : "#005500";
		context.fillRect(currentUser.x - 5, currentUser.y - 5, 10, 10);
		//draw texts
		for(var anim in animations){
			animations[anim].drawFtn(context);
		}

	}
	requestAnimationFrame(localLoop);
}

function updateIsIt(isIt){
	currentUser.isIt = isIt;
	if(currentUser.isIt){
		document.getElementById('isIt').style.display = "block";
	} else{
		document.getElementById('isIt').style.display = "none";
	}
}

function updateLoop(){
	if(hasReturned){
		hasReturned = false;
		GET('loop/' + currentUser.id + "/" + currentUser.x + "/" + currentUser.y, function(data){
			hasReturned = true;
			updateData = JSON.parse(data);
		});
		document.cookie = "user=" + encodeURIComponent(JSON.stringify(currentUser));
	}
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