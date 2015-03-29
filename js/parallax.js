var horizontal_only = true;

function Parallax(target, manifest)
{
	this.target = target;
	this.dim = {width: 0, height: 0};
	
	if(typeof(manifest)=='string')
		$.getJSON(manifest, null, $.proxy(this.init, this));
	else
		this.init(manifest);
	
}

Parallax.prototype = {
	init: function(manifest)
	{
		this.manifest = manifest;
		this.base = (manifest.base) ? manifest.base : './';
		if(manifest.width) this.dim.width = manifest.width;
		if(manifest.height) this.dim.height = manifest.height;
		this.layers = manifest.parallax_layers;
		this.create();
	},
	create: function()
	{
		$.each(this.layers, $.proxy(function(i, layer) {
			layer.el = $('<img>')
				.attr('src', this.base + layer.src)
				.css({
					position: 'absolute',
					bottom: layer.y,
					left: layer.x,
					'z-index': (layer.z < 0) ? -layer.z : 0
				})
				.appendTo(this.target)
		}, this));
		this.target.css(this.dim);
		this.target.css({'position': 'relative'});
		this.target.mousemove($.proxy(function(e) {
			var element = this.target[0];
			var target_left = findPos(element)[0];
			var target_top = findPos(element)[1];
			var x_offset = e.pageX - target_left;
			var y_offset = e.pageY - target_top;
			var rx_offset = x_offset - this.dim.width/2;
			var ry_offset = y_offset - this.dim.height/2;
			var rx_frac = rx_offset / this.dim.width;
			var ry_frac = ry_offset / this.dim.height;
			this.update(rx_frac, ry_frac);
		}, this));
	},
	update: function(rx, ry) {
		$.each(this.layers, $.proxy(function(i, layer) {
			layer.el.css(parallaxTransform(rx, ry, layer, this.dim.width, this.dim.height))
		},this))
	}
}

function parallaxTransform(rx, ry, layer, width, height)
{
	var bottom = (horizontal_only) ? layer.y : layer.y + ry * layer.z;
	var left = layer.x + rx * layer.z;
	
	return {bottom: bottom, left: left}
}
function findPos(obj) {
	var curleft = curtop = 0;
	if (obj.offsetParent) {
		do {
			curleft += obj.offsetLeft;
			curtop += obj.offsetTop;
		} while (obj = obj.offsetParent);
	return [curleft,curtop];
	}
}