(function ($) {

"use strict";

  // MENU
  $('#sidebarMenu .nav-link').on('click',function(){
    $("#sidebarMenu").collapse('hide');
  });

  // CUSTOM LINK
  $('.smoothscroll').click(function(){
    var el = $(this).attr('href');
    var elWrapped = $(el);
    var header_height = $('.navbar').height();

    scrollToDiv(elWrapped,header_height);
    return false;

    function scrollToDiv(element,navheight){
      var offset = element.offset();
      var offsetTop = offset.top;
      var totalScroll = offsetTop-navheight;

      $('body,html').animate({
      scrollTop: totalScroll
      }, 300);
    }
  });

})(window.jQuery);

//jquery-click-scroll

var sectionArray = [1, 2, 3, 4, 5];

$.each(sectionArray, function(index, value){

     $(document).scroll(function(){
         var offsetSection = $('#' + 'section_' + value).offset().top - 0;
         var docScroll = $(document).scrollTop();
         var docScroll1 = docScroll + 1;


         if ( docScroll1 >= offsetSection ){
             $('#sidebarMenu .nav-link').removeClass('active');
             $('#sidebarMenu .nav-link:link').addClass('inactive');
             $('#sidebarMenu .nav-item .nav-link').eq(index).addClass('active');
             $('#sidebarMenu .nav-item .nav-link').eq(index).removeClass('inactive');
         }

     });

    $('.click-scroll').eq(index).click(function(e){
        var offsetClick = $('#' + 'section_' + value).offset().top - 0;
        e.preventDefault();
        $('html, body').animate({
            'scrollTop':offsetClick
        }, 300)
    });

});

$(document).ready(function(){
    $('#sidebarMenu .nav-item .nav-link:link').addClass('inactive');
    $('#sidebarMenu .nav-item .nav-link').eq(0).addClass('active');
    $('#sidebarMenu .nav-item .nav-link:link').eq(0).removeClass('inactive');
});


function createPieChart(data, containerId, descId) {

      let width, height, radius,translateX, translateY, size;
      if (window.innerWidth < 400) {
         width = 100;
         height = 100;
         radius = 50;
         size = '8px';
      }else {
         width = 200;
         height = 200;
         radius = 100;
         size = '15px';
      }
      translateX = width / 2 + 2;
      translateY = height / 2 + 2;
    var color = function(d) {
        var colors = ["#bc80bd", "#ccebc5", "#f781bf", "#fbb4ae", "#b3cde3", "#ffed6f", "#decbe4", "#fed9a6"];
        return colors[d];
    };

    const svg = d3.select(`#${containerId}`)
        .append('svg')
        .attr('width', width+3)
        .attr('height', height+3)
        .append('g')
        .attr('transform', `translate(${translateX}, ${translateY})`);

        var pie = d3.layout.pie()
            .sort(null)
           .startAngle(1.1*Math.PI)
            .endAngle(3.1*Math.PI)
            .value(function(d) { return d.value; });


    const arc = d3.arc()
        .outerRadius(radius)
        .innerRadius(1);

        const arcs = svg.selectAll('arc')
            .data(pie(data))
            .enter()
            .append('g')
            .attr('class', 'arc');

var infoDiv = d3.select(`#${descId}`);


            arcs.append('path')
         .attr('d', arc)
         .attr('fill', (d, i) => color(i))
         .style("fill", function(d) { return d.data.color; })
         .style('opacity', 1)
         .on('mouseover', function(d) {
             d3.select(this).attr('stroke', 'black').attr('stroke-width', 2)
             .transition()
             .duration(200)
             .style('opacity', 0.5);
             svg.append('text')
                        .attr('id', 'tooltip')
                        .attr('text-anchor', 'middle')
                        .style('font-size', size)
                        .style('fill', 'black')
                        infoDiv
                        .html(function() {
                              return `${d.data.label}<br> ${d.data.time}`;
                          });



                })
                .on('mouseout', function() {
                    d3.select(this).attr('stroke', '').attr('stroke-width', 0)
                    .transition()
                    .duration(200)
                    .style('opacity', 1)
                    d3.select('#tooltip').remove()
                    infoDiv
                        .html("");


                })
                .transition().duration(1500)
                .attrTween('d', function(d) {
                    var i = d3.interpolate(d.startAngle + 0.1, d.endAngle);
                    return function(t) {
                        d.endAngle = i(t);
                        return arc(d);
                    }
         });

}

const exp = [
  { label: 'Internships', value: 7, time:'2019 - 2020', color:1 },
      { label: 'Data Engineering', value: 56, time:'2020-2026', color: 3 },
      { label: 'Teaching', value: 37, time:'2020-2024', color:4 }
];

const edu = [
    { label: 'Biochesmistry Licence', value: 37.5, time:'2015 - 2018', color:4 },
    { label: 'Bioinformatics Master', value: 25, time:'2018 - 2020', color:5 },
    { label: 'Computational Biology PhD', value: 37.5, time: '2021 - 2024', color:6 },
];

const skills = [
    { label: 'R', value: 20, time:'', color:7 },
    { label: 'Python', value: 20, time:'', color:8 },
    { label: 'Web', value: 20, time: 'HTML, CSS, JS, PHP, mySQL', color:9 },
    { label: 'Bash', value: 20, time: '', color:10 },
    { label: 'C++', value: 10, time: '', color:11 },
    { label: 'Java', value: 10, time: '', color:12 },
];

createPieChart(exp, 'pie1', 'desc');
createPieChart(edu, 'pie2','desc2');
createPieChart(skills, 'pie3','desc3');

const events = [
  { ev: 'Licence', start: '09/2015', end: '06/2018' },
  { ev: 'Master', start: '09/2018', end: '06/2020' },
  { ev: 'Engineer', start: '08/2020', end: '09/2021' },
  { ev: 'PhD', start: '09/2021', end: '10/2024' },
  { ev: 'Engineer', start: '01/2025', end: '08/2026' }
];

let width;
let rectheigth;
if (window.innerWidth >= 900) {
    width = 800;
    rectheigth = 12;
} else if (window.innerWidth < 900 && window.innerWidth >= 700) {
    width = 600;
    rectheigth = 12;
} else if (window.innerWidth < 700) {
    width = 330;
    rectheigth = 9;
}

const height = 100;
const svg = d3.select('#timeline')
  .append('svg')
  .attr('width', width)
  .attr('height', height);

const parseDate = d3.timeParse('%m/%Y');
events.forEach(event => {
  event.start = parseDate(event.start);
  event.end = parseDate(event.end);
});


const xScale = d3.scaleTime()
  .domain([d3.min(events, d => d.start), d3.max(events, d => d.end)])
  .range([2,width]);

  svg.selectAll('.event')
    .data(events)
    .enter()
    .append('g')
    .attr('class', 'event-group')
    .attr('transform', d => 'translate(' + xScale(d.start) + ',' + (height / 2 - 20) + ')')
    .each(function (d) {
      d3.select(this)
        .append('rect')
        .attr('class', 'event')
        .attr('width', xScale(d.end) - xScale(d.start)-1)
        .attr('height', 20)
        .attr('fill', '#12e2c0');

      d3.select(this)
        .append('text')
        .attr('class', 'event-label')
        .attr('x',2)
        .attr('y', -10)
        .style('font-size', rectheigth)
        .style('fill', 'black')
        .text(d => d.ev);

    });

const xAxis = d3.axisBottom(xScale);
svg.append('g')
  .attr('class', 'axis')
  .attr('transform', 'translate(0,' + (height / 2) + ')')
  .call(xAxis);

d3.select('#timeline')
  .append('div')
  .attr('id', 'tooltip')
  .style('position', 'absolute')
  .style('z-index', '10')
  .style('opacity', 0);

  function showArticle(articleId) {
      document.getElementById(articleId).style.display = "block";
      document.getElementById("overlay").classList.add("active");
  }

  function closeArticle() {
      document.querySelectorAll(".article-popup").forEach(article => article.style.display = "none");
      document.getElementById("overlay").classList.remove("active");
  }
