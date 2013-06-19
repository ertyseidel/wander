
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