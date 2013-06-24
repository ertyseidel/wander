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

var socket = io.connect('http://192.168.1.189');

var QUERY_SPEED = 25;

//Set up window animation request frame (x-browser compatibility)
(function() {
	var requestAnimationFrame = window.requestAnimationFrame || window.mozRequestAnimationFrame || window.webkitRequestAnimationFrame || window.msRequestAnimationFrame;
	window.requestAnimationFrame = requestAnimationFrame;
})();


window.onload = function(){
	//Set up the user object and make sure it is current and valid
	var playerData = retrievePlayerCookieData();
	if(typeof(playerData) == 'undefined'){
		GET('/createuser', function(playerData){
			playerData = JSON.parse(playerData);
			document.cookie = "user=" + encodeURIComponent(playerData.id);
			currentPlayer = playerData;
		});
	} else{
		GET('/checkuser/' + playerData, function(checkPlayerData){
			checkPlayerData = JSON.parse(checkPlayerData);
			if(checkPlayerData.status == 'false'){
				GET('/createuser', function(newPlayerData){
					newPlayerData = JSON.parse(newPlayerData);
					document.cookie = "user=" + encodeURIComponent(newPlayerData.id);
					currentPlayer = newPlayerData;
				});
			} else{
				currentPlayer = playerData;
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
			emitSocketLoop();
			requestAnimationFrame(localLoop);
		}
	}, 100);
};

function localLoop(){
	if(typeof(updateData) != 'boolean'){
		if(typeof(updateData) === 'string') updateData = JSON.parse(updateData);
		if(typeof(currentWorld) == 'boolean') currentWorld = updateData.world;
		//set up world
		if(currentWorld.id != updateData.world.id){
			queueAnimation(new AnimationText("NEW GAME!"));
			currentWorld = updateData.world;
		}
		if(currentWorld.width != context.canvas.width) context.canvas.width = currentWorld.width;
		if(currentWorld.height != context.canvas.height) context.canvas.height = currentWorld.height;
		//update user position
		currentPlayer.keyx = (-1 * (keys[65] || keys[37])) + (1 * (keys[68] || keys[39]));
		currentPlayer.keyy = (-1 * (keys[87] || keys[38])) + (1 * (keys[83] || keys[40]));
		movePlayer(currentPlayer);
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
				movePlayer(p);
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

function emitSocketLoop(){
	socket.emit('loop', {
		"id": currentPlayer.id,
		"x": currentPlayer.x,
		"y": currentPlayer.y,
		"vx": currentPlayer.vx,
		"vy": currentPlayer.vy,
		"keyx": currentPlayer.keyx,
		"keyy": currentPlayer.keyy
	});
}

socket.on('loop', function(data){
	updateData = data;
	emitSocketLoop();
});

function retrievePlayerCookieData(){
	allCookies = document.cookie;
	allCookies = document.cookie.split(";");
	for(var i = 0; i < allCookies.length; i++){
		var cook = allCookies[i].split("=");
		if(cook[0].trim() == 'user'){
			return decodeURIComponent(cook[1]);
		}
	}
}

function GET(url, callback){
	var oReq = new XMLHttpRequest();
	oReq.onload = function(){callback.apply(this, [this.responseText])};
	oReq.open("get", url, true);
	oReq.send();
}