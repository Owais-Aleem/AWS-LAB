(function(){
  const isLocal = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
  const API_BASE = isLocal ? 'http://localhost:3000' : ''; // In AWS behind ALB, '' keeps same-origin and path-based route /api/*
  const $ = (id) => document.getElementById(id);
  const status = (el, msg, ok=true) => { el.textContent = msg; el.className = ok ? 'status ok' : 'status err'; }

  async function checkHealth(){
    try{
      const r = await fetch(`${API_BASE}/api/health`);
      if(!r.ok) throw new Error(await r.text());
      const data = await r.json();
      status($('health'), `backend: ${data.status}` , true);
    }catch(e){
      status($('health'), 'backend unreachable', false);
    }
  }

  async function addEmployee(){
    const id = $('empId').value.trim();
    const name = $('empName').value.trim();
    if(!id || !name){
      return status($('addStatus'), 'please enter both id and name', false);
    }
    try{
      const r = await fetch(`${API_BASE}/api/employees`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ id, name })
      });
      const data = await r.json();
      if(!r.ok) throw new Error(data.error || 'failed');
      status($('addStatus'), 'saved ✔', true);
      $('empId').value = ''; $('empName').value = '';
    }catch(e){
      status($('addStatus'), e.message, false);
    }
  }

  async function loadEmployees(){
    $('rows').innerHTML = '';
    status($('listStatus'), 'loading…', true);
    try{
      const r = await fetch(`${API_BASE}/api/employees`);
      const data = await r.json();
      if(!r.ok) throw new Error(data.error || 'failed');
      const frag = document.createDocumentFragment();
      data.forEach(row => {
        const tr = document.createElement('tr');
        const td1 = document.createElement('td');
        const td2 = document.createElement('td');
        td1.textContent = row.id;
        td2.textContent = row.name;
        tr.appendChild(td1); tr.appendChild(td2);
        frag.appendChild(tr);
      });
      $('rows').appendChild(frag);
      status($('listStatus'), `loaded ${data.length} employees`, true);
    }catch(e){
      status($('listStatus'), e.message, false);
    }
  }

  $('btnAdd').addEventListener('click', addEmployee);
  $('btnLoad').addEventListener('click', loadEmployees);
  checkHealth();
})();