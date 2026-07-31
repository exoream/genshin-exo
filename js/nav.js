(function(){
  var toggle=document.getElementById("navToggle");
  var links=document.querySelector(".nav-links");
  if(!toggle||!links) return;
  toggle.addEventListener("click",function(e){
    e.stopPropagation();
    var open=links.classList.toggle("open");
    toggle.classList.toggle("open",open);
    toggle.setAttribute("aria-expanded",open?"true":"false");
  });
  document.addEventListener("click",function(e){
    if(!e.target.closest(".main-nav")){
      links.classList.remove("open");
      toggle.classList.remove("open");
      toggle.setAttribute("aria-expanded","false");
    }
  });
  window.addEventListener("resize",function(){
    if(window.innerWidth>768){
      links.classList.remove("open");
      toggle.classList.remove("open");
      toggle.setAttribute("aria-expanded","false");
    }
  });
})();
