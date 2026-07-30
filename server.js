const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { ZipArchive } = require('archiver');

// Load .env
var envPath = path.join(__dirname, '.env');
if(fs.existsSync(envPath)){
  fs.readFileSync(envPath, 'utf-8').split('\n').forEach(function(line){
    line = line.trim();
    if(!line || line.startsWith('#')) return;
    var eq = line.indexOf('=');
    if(eq > -1) process.env[line.slice(0, eq).trim()] = line.slice(eq + 1).trim();
  });
}

var sessions = new Map();

var ADMIN_USERNAME = process.env.ADMIN_USERNAME;
var ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
var SESSION_EXPIRY_MS = (parseInt(process.env.SESSION_EXPIRY_HOURS) || 24) * 60 * 60 * 1000;

function generateToken(){
  return crypto.randomBytes(32).toString('hex');
}

function parseCookies(req){
  var result = {};
  var cookieStr = req.headers.cookie;
  if(!cookieStr) return result;
  cookieStr.split(';').forEach(function(c){
    var parts = c.trim().split('=');
    if(parts.length >= 2) result[parts[0]] = parts.slice(1).join('=');
  });
  return result;
}

function isAuthenticated(req){
  var cookies = parseCookies(req);
  var token = cookies.session;
  if(!token || !sessions.has(token)) return false;
  var session = sessions.get(token);
  if(Date.now() - session.createdAt > SESSION_EXPIRY_MS){
    sessions.delete(token);
    return false;
  }
  return true;
}

// Clean up expired sessions every 10 minutes
setInterval(function(){
  var now = Date.now();
  sessions.forEach(function(val, key){
    if(now - val.createdAt > SESSION_EXPIRY_MS) sessions.delete(key);
  });
}, 10 * 60 * 1000);

var PORT = 3000;
var DATA_DIR = path.join(__dirname, 'data');
var MIME = {
  '.html':'text/html','.css':'text/css','.js':'application/javascript',
  '.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg',
  '.gif':'image/gif','.svg':'image/svg+xml','.ico':'image/x-icon',
  '.webp':'image/webp','.json':'application/json'
};

function initData(){
  if(!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, {recursive:true});
  var stores = ['talents','weapon-materials','artifacts','weapons','characters','regions'];
  stores.forEach(function(s){
    var p = path.join(DATA_DIR, s+'.json');
    if(!fs.existsSync(p)) fs.writeFileSync(p, '[]', 'utf-8');
  });
  var rp = path.join(DATA_DIR, 'regions.json');
  var regions = JSON.parse(fs.readFileSync(rp, 'utf-8') || '[]');
  if(regions.length === 0){
    var defaults = ["Mondstadt","Liyue","Inazuma","Sumeru","Fontaine","Natlan","Other"];
    defaults.forEach(function(n){
      regions.push({ id: Date.now().toString(36) + Math.random().toString(36).slice(2,8), name: n });
    });
    writeFile('regions', regions);
  }
}

function readFile(store){
  var p = path.join(DATA_DIR, store+'.json');
  if(!fs.existsSync(p)) return null;
  return JSON.parse(fs.readFileSync(p, 'utf-8') || '[]');
}

function writeFile(store, data){
  var p = path.join(DATA_DIR, store+'.json');
  fs.writeFileSync(p, JSON.stringify(data, null, 2), 'utf-8');
}

function parseBody(req){
  return new Promise(function(resolve, reject){
    var body = '';
    req.on('data', function(c){ body += c; });
    req.on('end', function(){
      try { resolve(JSON.parse(body)); }
      catch(e){ reject(e); }
    });
  });
}

function sendJSON(res, code, data){
  res.writeHead(code, {'Content-Type':'application/json', 'Access-Control-Allow-Origin':'*'});
  res.end(JSON.stringify(data));
}

var UPLOAD_DIR = path.join(__dirname, 'uploads');

function handleUpload(req, res){
  parseBody(req).then(function(body){
    if(!body.data || !body.name){
      sendJSON(res, 400, {error:'Missing data or name'});
      return;
    }
    var ext = path.extname(body.name) || '.png';
    var filename = Date.now().toString(36) + '_' + Math.random().toString(36).slice(2,6) + ext;
    var filepath = path.join(UPLOAD_DIR, filename);
    var buffer = Buffer.from(body.data.split(',')[1]||body.data, 'base64');
    fs.writeFile(filepath, buffer, function(err){
      if(err){ sendJSON(res, 500, {error:'Write failed'}); return; }
      sendJSON(res, 200, {url:'/uploads/'+filename});
    });
  }).catch(function(){
    sendJSON(res, 400, {error:'Invalid JSON'});
  });
}

function handleAPI(req, res, parts){
  var store = parts[2];
  var id = parts[3];
  var sub = parts[4];

  if(!store) { sendJSON(res, 400, {error:'Store name required'}); return; }

  var data = readFile(store);
  if(data === null) { sendJSON(res, 404, {error:'Store not found'}); return; }

  var method = req.method;

  if(method === 'GET' && id === 'count'){
    sendJSON(res, 200, data.length);
    return;
  }
  if(method === 'GET' && !id){
    sendJSON(res, 200, data);
    return;
  }
  if(method === 'GET' && id){
    var item = null;
    for(var i=0;i<data.length;i++){ if(data[i].id === id){ item = data[i]; break; } }
    if(!item) { sendJSON(res, 404, {error:'Not found'}); return; }
    sendJSON(res, 200, item);
    return;
  }

  if(method === 'POST' && !id){
    parseBody(req).then(function(body){
      var obj = { id: Date.now().toString(36) + Math.random().toString(36).slice(2,8) };
      Object.keys(body).forEach(function(k){ obj[k] = body[k]; });
      data.push(obj);
      writeFile(store, data);
      sendJSON(res, 201, obj);
    }).catch(function(){
      sendJSON(res, 400, {error:'Invalid JSON'});
    });
    return;
  }

  if(method === 'PUT' && id){
    parseBody(req).then(function(body){
      var idx = -1;
      for(var i=0;i<data.length;i++){ if(data[i].id === id){ idx = i; break; } }
      if(idx === -1) { sendJSON(res, 404, {error:'Not found'}); return; }
      data[idx] = Object.assign({}, data[idx], body);
      writeFile(store, data);
      sendJSON(res, 200, data[idx]);
    }).catch(function(){
      sendJSON(res, 400, {error:'Invalid JSON'});
    });
    return;
  }

  if(method === 'DELETE' && id){
    var filtered = [];
    var found = false;
    for(var i=0;i<data.length;i++){
      if(data[i].id === id){ found = true; continue; }
      filtered.push(data[i]);
    }
    if(!found) { sendJSON(res, 404, {error:'Not found'}); return; }
    writeFile(store, filtered);
    sendJSON(res, 200, {ok:true});
    return;
  }

  sendJSON(res, 405, {error:'Method not allowed'});
}

var server = http.createServer(function(req, res){
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if(req.method === 'OPTIONS'){
    res.writeHead(204);
    res.end();
    return;
  }

  var url = new URL(req.url, 'http://localhost:'+PORT);
  var pathname = url.pathname;

  if(pathname === '/api/login' && req.method === 'POST'){
    parseBody(req).then(function(body){
      if(body.username === ADMIN_USERNAME && body.password === ADMIN_PASSWORD){
        var token = generateToken();
        sessions.set(token, { username: body.username, createdAt: Date.now() });
        var maxAge = Math.floor(SESSION_EXPIRY_MS / 1000);
        res.setHeader('Set-Cookie', 'session='+token+'; HttpOnly; Path=/; SameSite=Lax; Max-Age='+maxAge);
        sendJSON(res, 200, { ok: true, message: 'Login successful' });
      } else {
        sendJSON(res, 401, { error: 'Invalid credentials' });
      }
    }).catch(function(){
      sendJSON(res, 400, { error: 'Invalid JSON' });
    });
    return;
  }

  if(pathname === '/api/logout' && req.method === 'POST'){
    var cookies = parseCookies(req);
    var token = cookies.session;
    if(token) sessions.delete(token);
    res.setHeader('Set-Cookie', 'session=; HttpOnly; Path=/; Max-Age=0');
    sendJSON(res, 200, { ok: true, message: 'Logged out' });
    return;
  }

  if(pathname === '/api/upload'){
    handleUpload(req, res);
    return;
  }

  if(pathname.startsWith('/api/download/') && req.method === 'GET'){
    if(!isAuthenticated(req)){
      sendJSON(res, 401, { error: 'Unauthorized' });
      return;
    }
    var downloadParts = pathname.split('/');
    var source = downloadParts[3];
    var filename = downloadParts.slice(4).join('/');
    if(!source || (source !== 'data' && source !== 'uploads')){
      sendJSON(res, 400, { error: 'Invalid download path' });
      return;
    }
    var baseDir = source === 'data' ? DATA_DIR : UPLOAD_DIR;

    // Download entire folder as zip
    if(!filename){
      var archive = new ZipArchive();
      res.writeHead(200, {
        'Content-Type': 'application/zip',
        'Content-Disposition': 'attachment; filename="' + source + '.zip"'
      });
      archive.pipe(res);
      archive.directory(baseDir, false);
      archive.finalize();
      return;
    }

    // Download individual file
    var filepath = path.join(baseDir, filename);
    if(!filepath.startsWith(baseDir)){
      sendJSON(res, 403, { error: 'Forbidden' });
      return;
    }
    fs.readFile(filepath, function(err, content){
      if(err){
        sendJSON(res, 404, { error: 'File not found' });
        return;
      }
      res.writeHead(200, {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': 'attachment; filename="' + filename.split('/').pop() + '"'
      });
      res.end(content);
    });
    return;
  }

  if(pathname.startsWith('/api/')){
    if(!isAuthenticated(req)){
      sendJSON(res, 401, { error: 'Unauthorized' });
      return;
    }
    var parts = pathname.split('/');
    handleAPI(req, res, parts);
    return;
  }

  var publicPaths = ['/login.html', '/css/', '/js/', '/uploads/', '/data/'];
  var isPublic = false;
  for(var i=0;i<publicPaths.length;i++){
    if(pathname === publicPaths[i] || pathname.startsWith(publicPaths[i])){
      isPublic = true;
      break;
    }
  }

  if(!isPublic && !isAuthenticated(req)){
    res.writeHead(302, { 'Location': '/login.html' });
    res.end();
    return;
  }

  var filePath = path.join(__dirname, pathname === '/' ? 'index.html' : pathname);
  try {
    if(fs.statSync(filePath).isDirectory()){
      var dirName = path.basename(filePath);
      var indexInDir = path.join(filePath, dirName + '.html');
      filePath = fs.existsSync(indexInDir) ? indexInDir : path.join(filePath, 'index.html');
    }
  } catch(e){}
  var ext = path.extname(filePath);
  var ct = MIME[ext] || 'application/octet-stream';

  fs.readFile(filePath, function(err, content){
    if(err){
      if(err.code === 'ENOENT'){
        res.writeHead(404, {'Content-Type':'text/html'});
        res.end('<h1>404 - File not found</h1>');
      } else {
        res.writeHead(500, {'Content-Type':'text/html'});
        res.end('<h1>500 - Internal Server Error</h1>');
      }
      return;
    }
    res.writeHead(200, {'Content-Type': ct});
    res.end(content);
  });
});

initData();
server.listen(PORT, function(){
  console.log('✦ Adventurer\'s Log running at http://localhost:'+PORT);
  console.log('✦ Data folder: '+DATA_DIR);
});
