const d3 = require("d3");

var ac = new AudioContext();

// get current General Midi sound
var selectInstrument = document.getElementById("selectSound");
var chosenOption = selectInstrument.options[selectInstrument.selectedIndex];
// var selectPitches = document.getElementById("selectPitches");
// var chosenPitches = selectPitches.options[selectPitches.selectedIndex];

selectInstrument.onchange = function() {
	chosenOption = this.options[this.selectedIndex];
	// console.log("sound = " + chosenOption.value);
	Soundfont.instrument(ac, chosenOption.value).then(playmidi); // when user selects a new instrument, playmidi function is triggered
	}
 
/* selectPitches.onchange = function() {
	chosenPitches = this.options[this.selectedIndex];
	console.log("chosenPitches = " + chosenPitches.value);
	}    */
 
var bottomNote = 48;	// 21 == lowest midi note of piano
var topNote = 108;		// 108 == highest midi note of piano

// ---------- d3 charting code ----------
var margin = {top: 20, right: 50, bottom: 30, left: 50};
const width = 960 - margin.left - margin.right,
const height = 500 - margin.top - margin.bottom;

var parseDate = d3.time.format("%d-%b-%y").parse,
		bisectDate = d3.bisector(function(d) { return d.date; }).left,
		formatValue = d3.format(",.2f"),
		formatCurrency = function(d) { return "$" + formatValue(d); };

var x = d3.time.scale()
		.range([0, width]);

var y = d3.scale.linear()
		.range([height, 0]);

var xAxis = d3.svg.axis()
		.scale(x)
		.orient("bottom");

var yAxis = d3.svg.axis()
		.scale(y)
		.orient("left");

var line = d3.svg.line()
		.x(function(d) { return x(d.date); })
		.y(function(d) { return y(d.close); });

var svg = d3.select("body").append("svg")
		.attr("width", width + margin.left + margin.right)
		.attr("height", height + margin.top + margin.bottom)
	.append("g")
		.attr("transform", "translate(" + margin.left + "," + margin.top + ")");

// load in data - it would be nice to be able to substitute your own data here via a menu, etc.
d3.tsv("data.tsv", function(error, data) {
	if (error) throw error;
	
	data.forEach(function(d) {
		d.date = parseDate(d.date);
		d.close = +d.close;
	});

	data.sort(function(a, b) {
		return a.date - b.date;
	});

	x.domain([data[0].date, data[data.length - 1].date]);
	y.domain(d3.extent(data, function(d) { return d.close; }));
			
	svg.append("g")
			.attr("class", "x axis")
			.attr("transform", "translate(0," + height + ")")
			.call(xAxis);

	svg.append("g")
			.attr("class", "y axis")
			.call(yAxis)
		.append("text")
			.attr("transform", "rotate(-90)")
			.attr("y", 6)
			.attr("dy", ".71em")
			.style("text-anchor", "end")
			.text("Price ($)");
	});
	
// ----- midi playback incorporates the d3 data code -----
// the whole thing is wrapped in the midi player function; that was the only way I could get it to work

playmidi = function (piano) {
// load in data a second time for the blue data line (yes this is inefficient)
d3.tsv("data.tsv", function(error, data) {
	if (error) throw error;

	data.forEach(function(d) {
		d.date = parseDate(d.date);
		d.close = +d.close;
	});

	data.sort(function(a, b) {
		return a.date - b.date;
	});

	x.domain([data[0].date, data[data.length - 1].date]);
	y.domain(d3.extent(data, function(d) { return d.close; }));
	
// ----- take y, and scale it to midi notes (using bottomNote and topNote values above) -----
 
//  choosePitches = function (diatonic) {
//	  if (chosenPitches.value = "diatonic") {  // this if/else does not do anything

		var midiPitch = d3.scale.quantile() // quantile lets me assign arbitrary scaling values (e.g. a diatonic scale)
		 .domain(d3.extent(data, function(d) {return d.close}))
		 .range([48, 50, 52, 53, 55, 57, 59, 60, 62, 64, 65, 67, 69, 71, 72, 74, 76, 77, 79, 81, 83, 84, 86, 88, 89, 91, 93, 95, 96]);
		 // }
/* 	  else { 
		var midiPitch = d3.scale.linear() // chromatic scale
		.domain(d3.extent(data, function(d) { return d.close; }))
		.rangeRound([bottomNote, topNote])	// .rangeRound to get integers for midi pitches
		}
	} */

	// how to erase/redraw the chart when a new sound (marimba etc.) is selected?
	svg.append("path") // attempt to erase before redrawing: draw as white, then as steelblue - kind of a hack but it seems to work
			.datum(data)
			.attr("class", "linewhite")
			.attr("d", line);

	svg.append("path")
			.datum(data)
			.attr("class", "line")
			.attr("d", line);

	var focus = svg.append("g")
			.attr("class", "focus")
			.style("display", "none");

	focus.append("circle")
			.attr("r", 4.5);

	focus.append("text")
			.attr("x", 9)
			.attr("dy", ".35em");

	svg.append("rect")
			.attr("class", "overlay")
			.attr("width", width)
			.attr("height", height)
			.on("mouseover", function() { focus.style("display", null); })
			.on("mouseout", function() { focus.style("display", "none"); })
			.on("mousemove", mousemove);
			
	function mousemove() {  
		var x0 = x.invert(d3.mouse(this)[0]),
				i = bisectDate(data, x0, 1),
				d0 = data[i - 1],
				d1 = data[i],
				d = x0 - d0.date > d1.date - x0 ? d1 : d0;
		focus.attr("transform", "translate(" + x(d.date) + "," + y(d.close) + ")");
		focus.select("text").text(formatCurrency(d.close));

		// play midiPitch
		if (x0 % 3 == 1) {		// don't playback every single x, it sounds too messy; 
			 // if (midiPitch(d.close) % 2 == 0) { // whole-tone scale; but it would be better to map this, instead of a sieve
				 // console.log("y = " + midiPitch(d.close));
				 piano.play(midiPitch(d.close), ac.currentTime, { duration: 0.15 });
			 // }
		}}
 });
}

Soundfont.instrument(ac, 'marimba').then(playmidi);
 // the whole thing is wrapped in the Soundfont function; 
 // this causes the chart to draw over itself, which is irritating; hack to fix it on line 185