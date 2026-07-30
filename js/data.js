var BASE_URL = window.location.origin + '/api';

function genId(){
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function req(url, opts){
  return fetch(url, opts).then(function(r){
    if(!r.ok) return r.json().then(function(e){ throw new Error(e.error||'Request failed'); });
    return r.json();
  });
}

function getAll(name){
  return req(BASE_URL+'/'+name);
}

function getById(name, id){
  return req(BASE_URL+'/'+name+'/'+id);
}

function create(name, item){
  return req(BASE_URL+'/'+name, {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify(item)
  });
}

function update(name, id, updates){
  return req(BASE_URL+'/'+name+'/'+id, {
    method: 'PUT',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify(updates)
  });
}

function remove(name, id){
  return req(BASE_URL+'/'+name+'/'+id, { method: 'DELETE' });
}

function count(name){
  return req(BASE_URL+'/'+name+'/count');
}

var regionsCache = null;

function loadRegions(){
  if(regionsCache) return Promise.resolve(regionsCache);
  return getAll("regions").then(function(r){
    if(r.length === 0){
      var defaults = ["Mondstadt","Liyue","Inazuma","Sumeru","Fontaine","Natlan","Other"];
      var chain = Promise.resolve();
      defaults.forEach(function(n){
        chain = chain.then(function(){ return create("regions", {name: n}); });
      });
      return chain.then(function(){ return getAll("regions"); });
    }
    return r;
  }).then(function(r){
    regionsCache = r;
    return r;
  });
}

function regionsToSelect(selectEl, selectedVal, allOption){
  return loadRegions().then(function(regions){
    selectEl.innerHTML = '';
    if(allOption){
      selectEl.innerHTML = '<option value="all">All Regions</option>';
    } else {
      selectEl.innerHTML = '<option value="">-- Select --</option>';
    }
    regions.forEach(function(r){
      var sel = r.name === selectedVal ? ' selected' : '';
      selectEl.innerHTML += '<option'+sel+'>'+r.name+'</option>';
    });
  });
}

function regionsList(){
  return loadRegions().then(function(r){ return r.map(function(x){ return x.name; }); });
}
