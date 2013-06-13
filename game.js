
var currentPlayer = false;
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

var animationsQueue = [];
function AnimationText(text, callback, size, x, y, color, holdDuration, fadeDuration){
	this.callback = callback;
	this.text = text;
	this.size = typeof(size) == 'undefined' ? 30 : size;
	this.x = typeof(x) == 'undefined' ? 100 : x;
	this.y = typeof(y) == 'undefined' ? 150 : y;
	this.color = typeof(color) == 'undefined' ? "FF0000" : color;
	this.fadeDuration = typeof(fadeDuration == 'undefined') ? 60 : fadeDuration;
	this.holdDuration = typeof(holdDuration == 'undefined') ? 60 : holdDuration;
	this.current = this.holdDuration + this.fadeDuration;
	this.drawFtn = function(context){
		context.font = "bold " + this.size + "pt Calibri";
		if(this.current < this.fadeDuration){
			context.fillStyle = toFadeColor(this.color, this.current / this.fadeDuration);
		} else{
			context.fillStyle = this.color;
		}
		context.fillText(this.text, this.x, this.y);
		if(--this.current < 0){
			animationsQueue.shift();
			if(typeof(callback) == 'function') callback.apply(this);
		}
	}
}

function queueAnimation(anim){
	animationsQueue.push(anim);
}

function toFadeColor(color, opacity){
	color = color.substring(1); // strip "#";
	var r = parseInt(parseInt(color.substring(0,2), 16) * opacity);
	var g = parseInt(parseInt(color.substring(2,4), 16) * opacity);
	var b = parseInt(parseInt(color.substring(4,6), 16) * opacity);
	return "rgb(" + r + "," + g + "," + b + ")";
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
			currentPlayer = userData;
		});
	} else{
		GET('/checkuser/' + userData.id, function(checkUserData){
			checkUserData = JSON.parse(checkUserData);
			if(checkUserData.status == 'false'){
				GET('/createuser', function(newUserData){
					newUserData = JSON.parse(newUserData);
					document.cookie = "user=" + encodeURIComponent(JSON.stringify(newUserData));
					currentPlayer = newUserData;
				});
			} else{
				currentPlayer = userData;
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
		if(typeof(currentPlayer) != 'boolean'){
			queueAnimation(new AnimationText("Welcome!"));
			clearInterval(loadingLoop);
			updateIsIt();
			setInterval(updateLoop, 50);
			requestAnimationFrame(localLoop);
		}
	}, 100);
}

updatePlayerPosition = function(player){
	//update velocity
	if (keys[87] || keys[38]){ //up
		player.vy -= player.acceleration;
		if(player.vy < -1 * player.speed){
			player.vy = -1 * player.speed;
		}
	}
	if(keys[65] || keys[37]){ //left
		player.vx -= player.acceleration;
		if(player.vx < -1 * player.speed){
			player.vx = -1 * player.speed;
		}
	}

	if (keys[83] || keys[40]){ //down
		player.vy += player.acceleration;
		if(player.vy > player.speed){
			player.vy = player.speed;
		}
	}
	if (keys[68] || keys[39]){ //right
		player.vx += player.acceleration;
		if(player.vx > 1 * player.speed){
			player.vx = 1 * player.speed;
		}
	}
	//apply friction
	player.vx *= player.friction;
	if(Math.abs(player.vx) < .01) player.vx = 0;
	player.vy *= player.friction;
	if(Math.abs(player.vy) < .01) player.vy = 0;
	//update location
	player.y += player.vy;
	player.x += player.vx;
	//check bounds
	if(player.x < 0) player.x = 0;
	if(player.x > currentWorld.width) player.x = currentWorld.width;
	if(player.y < 0) player.y = 0;
	if(player.y > currentWorld.height) player.y = currentWorld.height;
}

function localLoop(){
	if(typeof(updateData) != 'boolean'){
		if(typeof(currentWorld) == 'boolean') currentWorld = updateData.world;
		//set up world
		if(currentWorld.id != updateData.world.id){
			queueAnimation(new AnimationText("NEW GAME!"));
			currentWorld = updateData.world;
		}
		if(currentWorld.width != context.canvas.width) context.canvas.width = currentWorld.width;
		if(currentWorld.height != context.canvas.height) context.canvas.height = currentWorld.height;
		//update user position
		updatePlayerPosition(currentPlayer);
		//draw
		context.fillStyle="#000000";
		context.fillRect(0, 0, currentWorld.width, currentWorld.height);
		context.fillStyle="#ffffff";
		context.fillRect(currentPlayer.x - currentPlayer.viewDist, currentPlayer.y - currentPlayer.viewDist, currentPlayer.viewDist * 2, currentPlayer.viewDist * 2);
		for(var key in updateData.players){		
			if(updateData.players[key].id == currentPlayer.id){
				if(currentPlayer.isIt != updateData.players[key].isIt){
					updateIsIt(updateData.players[key].isIt);
				}
			} else {
				var p = updateData.players[key];
				//prediction
				if(p.vx != 0) p.x -= -1 * parseFloat(p.vx) * p.speed;
				if(p.vy != 0) p.y -= -1 * parseFloat(p.vy) * p.speed;
				//draw other players
				context.fillStyle= p.isIt ? "#FF0000" : "#00FF00";
				context.fillRect(p.x - 5, p.y - 5, 10, 10);
			}
		}
		context.fillStyle = currentPlayer.isIt ? "#550000" : "#005500";
		context.fillRect(currentPlayer.x - 5, currentPlayer.y - 5, 10, 10);
		//draw texts
		if(animationsQueue.length > 0){
			animationsQueue[0].drawFtn(context);
		}

	}
	requestAnimationFrame(localLoop);
}

function updateIsIt(isIt){
	currentPlayer.isIt = isIt;
	if(currentPlayer.isIt){
		if(currentPlayer.isIt) queueAnimation(new AnimationText('You Are It!'));
		document.getElementById('isIt').style.display = "block";
	} else{
		if(currentPlayer.isIt) queueAnimation(new AnimationText('You Are No Longer It!'));
		document.getElementById('isIt').style.display = "none";
	}
}

function updateLoop(){
	if(hasReturned){
		hasReturned = false;
		var vx = (-1 * (keys[65] || keys[37])) + (1 * (keys[68] || keys[39]));
		var vy = (-1 * (keys[87] || keys[38])) + (1 * (keys[83] || keys[40]));
		GET('loop/' + currentPlayer.id + "/" + currentPlayer.x + "/" + currentPlayer.y + "/" + vx + "/" + vy, function(data){
			hasReturned = true;
			updateData = JSON.parse(data);
		});
		document.cookie = "user=" + encodeURIComponent(JSON.stringify(currentPlayer));
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