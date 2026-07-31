(function(){
  function decorate(table){
    if(table.getAttribute("data-decorated")) return;
    var ths = table.querySelectorAll("thead th");
    if(!ths.length) return;
    var rows = table.querySelectorAll("tbody tr");
    for(var r=0;r<rows.length;r++){
      var tds = rows[r].querySelectorAll("td");
      for(var c=0;c<tds.length;c++){
        if(ths[c]) tds[c].setAttribute("data-label", ths[c].textContent.replace(/\s+/g," ").trim());
      }
    }
    table.setAttribute("data-decorated","1");
  }
  function scan(root){
    if(!root || root.nodeType !== 1) return;
    if(root.tagName && root.tagName.toLowerCase() === "table") decorate(root);
    var tables = root.querySelectorAll ? root.querySelectorAll("table") : [];
    for(var i=0;i<tables.length;i++) decorate(tables[i]);
  }
  scan(document);
  if(window.MutationObserver){
    new MutationObserver(function(muts){
      for(var i=0;i<muts.length;i++){
        var nodes = muts[i].addedNodes;
        for(var j=0;j<nodes.length;j++){
          scan(nodes[j]);
        }
      }
    }).observe(document.body,{childList:true,subtree:true});
  }
})();
