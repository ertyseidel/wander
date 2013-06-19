var movePlayer = function(player){
	//update velocity
	if (player.keyy == -1){ //up
		player.vy += -1 * player.acceleration;
		if(player.vy < -1 * player.speed){
			player.vy = -1 * player.speed;
		}
	}

	if(player.keyx == -1){ //left
		player.vx += -1 * player.acceleration;
		if(player.vx < -1 * player.speed){
			player.vx = -1 * player.speed;
		}
	}

	if (player.keyy == 1){ //down
		player.vy += player.acceleration;
		if(player.vy > player.speed){
			player.vy = player.speed;
		}
	}

	if (player.keyx == 1){ //right
		player.vx += player.acceleration;
		if(player.vx > player.speed){
			player.vx = player.speed;
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

//Thanks Mary!
function isColliding(obj1, obj2) {
	if(obj1.x + obj1.width < obj2.x) {
		return false;
	} else if(obj1.x > obj2.x + obj2.width) {
		return false;
	} else if(obj1.y > obj2.y + obj2.height) {
		return false;
	} else if(obj1.y + obj1.height < obj2.y) {
		return false
	} else {
		return true;
	}
}