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

var weaponStatsCache = null;

function loadWeaponStats(){
  if(weaponStatsCache) return Promise.resolve(weaponStatsCache);
  return getAll("weapon-stats").then(function(r){
    if(r.length === 0){
      var defaults = ["ATK%","HP%","DEF%","CRIT Rate%","CRIT DMG%","Energy Recharge%","Elemental Mastery","Physical DMG%"];
      var chain = Promise.resolve();
      defaults.forEach(function(n){
        chain = chain.then(function(){ return create("weapon-stats", {name: n}); });
      });
      return chain.then(function(){ return getAll("weapon-stats"); });
    }
    return r;
  }).then(function(r){
    weaponStatsCache = r;
    return r;
  });
}

function weaponStatsToSelect(selectEl, selectedVal){
  return loadWeaponStats().then(function(stats){
    var names = stats.map(function(s){ return s.name; });
    selectEl.innerHTML = '<option value="">-- Select Stat --</option>';
    if(selectedVal && names.indexOf(selectedVal) === -1){
      selectEl.innerHTML += '<option selected>' + selectedVal + '</option>';
    }
    stats.forEach(function(s){
      var sel = s.name === selectedVal ? ' selected' : '';
      selectEl.innerHTML += '<option' + sel + '>' + s.name + '</option>';
    });
  });
}

var weaponTypesCache = null;

function loadWeaponTypes(){
  if(weaponTypesCache) return Promise.resolve(weaponTypesCache);
  return getAll("weapon-types").then(function(r){
    if(r.length === 0){
      var defaults = ["Sword","Claymore","Polearm","Bow","Catalyst"];
      var chain = Promise.resolve();
      defaults.forEach(function(n){
        chain = chain.then(function(){ return create("weapon-types", {name: n}); });
      });
      return chain.then(function(){ return getAll("weapon-types"); });
    }
    return r;
  }).then(function(r){
    weaponTypesCache = r;
    return r;
  });
}

function weaponTypesToSelect(selectEl, selectedVal, allOption){
  return loadWeaponTypes().then(function(types){
    var names = types.map(function(t){ return t.name; });
    selectEl.innerHTML = allOption ? '<option value="all">All Types</option>' : '<option value="">-- Select Type --</option>';
    if(selectedVal && selectedVal !== "all" && names.indexOf(selectedVal) === -1){
      selectEl.innerHTML += '<option selected>' + selectedVal + '</option>';
    }
    types.forEach(function(t){
      var sel = t.name === selectedVal ? ' selected' : '';
      selectEl.innerHTML += '<option' + sel + '>' + t.name + '</option>';
    });
  });
}
