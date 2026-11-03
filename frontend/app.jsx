const { useState, useEffect } = React;

// Backend address: same origin when served by Express (port 5000), otherwise localhost:5000 (Live Server).
const API = location.port === '5000' ? '' : 'http://localhost:5000';

async function api(path, opts = {}) {
  const token = localStorage.getItem('sf_token');
  let res;
  try {
    res = await fetch(API + '/api' + path, {
      method: opts.method || 'GET',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
      body: opts.body ? JSON.stringify(opts.body) : undefined,
    });
  } catch (e) {
    throw new Error('Cannot reach the server. Start it with "npm start" in the backend folder.');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401 && token) {
      localStorage.removeItem('sf_token');
      window.dispatchEvent(new Event('sf-logout'));
    }
    throw new Error(data.error || 'Request failed.');
  }
  return data;
}

const money = (v) => (v === null || v === undefined ? '–' : Number(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }));

function Field({ label, hint, ...props }) {
  return (
    <label className="mb-3 block text-sm font-semibold">
      {label}{hint && <span className="ml-1 font-normal text-slate-500">{hint}</span>}
      <input className="mt-1 w-full rounded border border-slate-300 bg-white px-3 py-2 font-normal" {...props} />
    </label>
  );
}
const Err = ({ msg }) => (msg ? <p role="alert" className="mb-3 text-sm text-red-700">{msg}</p> : null);
const Btn = ({ kind = '', className = '', ...p }) => (
  <button
    className={'rounded border px-3 py-2 text-sm font-semibold ' +
      (kind === 'primary' ? 'border-teal-800 bg-teal-800 text-white hover:bg-teal-900 ' :
       kind === 'danger' ? 'border-red-700 bg-red-700 text-white hover:bg-red-800 ' :
       'border-slate-300 bg-white hover:border-slate-500 ') + className}
    {...p}
  />
);

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg bg-white p-6 shadow-xl">
        <h2 className="mb-4 text-lg font-bold">{title}</h2>
        {children}
      </div>
    </div>
  );
}

// ---------------- Auth pages (login + signup) ----------------
function AuthPage({ onAuth }) {
  const [mode, setMode] = useState('login');
  const [f, setF] = useState({ organizationName: '', email: '', password: '', confirm: '' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setErr('');
    if (mode === 'signup') {
      if (!f.organizationName.trim()) return setErr('Enter an organization name.');
      if (f.password.length < 8) return setErr('Use a password with at least 8 characters.');
      if (f.password !== f.confirm) return setErr('Passwords don’t match.');
    }
    setBusy(true);
    try {
      const body = mode === 'signup'
        ? { organizationName: f.organizationName, email: f.email, password: f.password }
        : { email: f.email, password: f.password };
      const data = await api('/auth/' + mode, { method: 'POST', body });
      localStorage.setItem('sf_token', data.token);
      onAuth(data);
    } catch (e2) { setErr(e2.message); }
    setBusy(false);
  }

  return (
    <div className="mx-auto mt-16 w-full max-w-md rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
      <h1 className="text-2xl font-extrabold">{mode === 'login' ? 'Log in to StockFlow' : 'Create your account'}</h1>
      <p className="mb-5 mt-1 text-slate-600">{mode === 'login' ? 'Pick up where your stock counts left off.' : 'Set up your store and start tracking stock.'}</p>
      <form onSubmit={submit} noValidate>
        {mode === 'signup' && <Field label="Organization name" placeholder="My Test Store" value={f.organizationName} onChange={set('organizationName')} />}
        <Field label="Email" type="email" autoComplete="email" value={f.email} onChange={set('email')} />
        <Field label="Password" hint={mode === 'signup' ? '(8+ characters)' : ''} type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} value={f.password} onChange={set('password')} />
        {mode === 'signup' && <Field label="Confirm password" type="password" autoComplete="new-password" value={f.confirm} onChange={set('confirm')} />}
        <Err msg={err} />
        <Btn kind="primary" className="w-full py-2.5" disabled={busy}>{busy ? 'Please wait…' : mode === 'login' ? 'Log in' : 'Sign up'}</Btn>
      </form>
      <p className="mt-4 text-center text-sm text-slate-600">
        {mode === 'login' ? 'New here? ' : 'Already registered? '}
        <button className="font-semibold text-teal-800 underline" onClick={() => { setErr(''); setMode(mode === 'login' ? 'signup' : 'login'); }}>
          {mode === 'login' ? 'Create an account' : 'Log in'}
        </button>
      </p>
    </div>
  );
}

// ---------------- Dashboard (FR-6) ----------------
function Dashboard() {
  const [d, setD] = useState(null);
  const [err, setErr] = useState('');
  useEffect(() => { api('/dashboard').then(setD).catch((e) => setErr(e.message)); }, []);
  if (err) return <Err msg={err} />;
  if (!d) return <p className="text-slate-600">Loading…</p>;
  return (
    <>
      <h1 className="mb-5 text-2xl font-extrabold">Dashboard</h1>
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Stat n={d.totalProducts} label="Products" />
        <Stat n={d.totalUnits.toLocaleString()} label="Units on hand" />
        <Stat n={d.lowStock.length} label="Low-stock items" warn={d.lowStock.length > 0} />
      </div>
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <h2 className="border-b border-slate-200 px-4 py-3 font-bold">Low stock items</h2>
        {d.lowStock.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead className="text-slate-500"><tr><th className="px-4 py-2">Name</th><th className="px-4 py-2">SKU</th><th className="px-4 py-2 text-right">On hand</th><th className="px-4 py-2 text-right">Threshold</th></tr></thead>
              <tbody>
                {d.lowStock.map((p) => (
                  <tr key={p.id} className="border-t border-slate-200">
                    <td className="px-4 py-2.5">{p.name}</td><td className="px-4 py-2.5">{p.sku}</td>
                    <td className="px-4 py-2.5 text-right"><span className="rounded bg-yellow-300 px-2 py-0.5 text-xs font-extrabold text-yellow-950">{p.quantity}</span></td>
                    <td className="px-4 py-2.5 text-right">{p.effectiveThreshold}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="p-5 text-slate-600">{d.totalProducts ? 'Nothing is running low. Every product is above its threshold.' : 'No products yet. Add your first product to start tracking stock.'}</p>
        )}
      </div>
    </>
  );
}
const Stat = ({ n, label, warn }) => (
  <div className={'rounded-lg border border-slate-200 bg-white p-4 ' + (warn ? 'border-l-8 border-l-yellow-300' : '')}>
    <div className="text-4xl font-extrabold leading-tight">{n}</div><div className="text-sm text-slate-600">{label}</div>
  </div>
);

// ---------------- Products (FR-3, FR-4, FR-5) ----------------
function ProductForm({ product, defaultThreshold, onSaved, onClose }) {
  const p = product;
  const [f, setF] = useState({
    name: p?.name ?? '', sku: p?.sku ?? '', quantity: p?.quantity ?? 0,
    costPrice: p?.costPrice ?? '', sellingPrice: p?.sellingPrice ?? '',
    lowStockThreshold: p?.lowStockThreshold ?? '', description: p?.description ?? '',
  });
  const [err, setErr] = useState('');
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  async function submit(e) {
    e.preventDefault();
    setErr('');
    try {
      await api(p ? '/products/' + p.id : '/products', { method: p ? 'PUT' : 'POST', body: f });
      onSaved(p ? 'Product saved' : 'Product added');
    } catch (e2) { setErr(e2.message); }
  }
  return (
    <Modal title={p ? 'Edit product' : 'Add product'} onClose={onClose}>
      <form onSubmit={submit} noValidate>
        <Field label="Name" value={f.name} onChange={set('name')} />
        <div className="grid gap-x-3 sm:grid-cols-2">
          <Field label="SKU" value={f.sku} onChange={set('sku')} />
          <Field label="Quantity on hand" type="number" min="0" step="1" value={f.quantity} onChange={set('quantity')} />
          <Field label="Cost price" hint="(optional)" type="number" min="0" step="0.01" value={f.costPrice} onChange={set('costPrice')} />
          <Field label="Selling price" hint="(optional)" type="number" min="0" step="0.01" value={f.sellingPrice} onChange={set('sellingPrice')} />
        </div>
        <Field label="Low-stock threshold" hint={`(blank uses your default of ${defaultThreshold})`} type="number" min="0" step="1" value={f.lowStockThreshold} onChange={set('lowStockThreshold')} />
        <label className="mb-3 block text-sm font-semibold">Description <span className="font-normal text-slate-500">(optional)</span>
          <textarea rows="2" className="mt-1 w-full rounded border border-slate-300 px-3 py-2 font-normal" value={f.description} onChange={set('description')} />
        </label>
        <Err msg={err} />
        <div className="flex justify-end gap-2"><Btn type="button" onClick={onClose}>Cancel</Btn><Btn kind="primary">{p ? 'Save changes' : 'Add product'}</Btn></div>
      </form>
    </Modal>
  );
}

function AdjustForm({ product, onSaved, onClose }) {
  const [delta, setDelta] = useState('');
  const [note, setNote] = useState('');
  const [err, setErr] = useState('');
  async function submit(e) {
    e.preventDefault();
    setErr('');
    try { await api(`/products/${product.id}/adjust`, { method: 'POST', body: { delta, note } }); onSaved('Stock updated'); }
    catch (e2) { setErr(e2.message); }
  }
  return (
    <Modal title="Adjust stock" onClose={onClose}>
      <form onSubmit={submit} noValidate>
        <p className="mb-3">{product.name} has <b>{product.quantity}</b> units on hand.</p>
        <Field label="Change by" hint="(use + or −, e.g. 10 or -3)" type="number" step="1" value={delta} onChange={(e) => setDelta(e.target.value)} />
        <Field label="Note" hint="(optional)" placeholder="Received shipment" value={note} onChange={(e) => setNote(e.target.value)} />
        <Err msg={err} />
        <div className="flex justify-end gap-2"><Btn type="button" onClick={onClose}>Cancel</Btn><Btn kind="primary">Update stock</Btn></div>
      </form>
    </Modal>
  );
}

function Products({ org, notify }) {
  const [rows, setRows] = useState(null);
  const [q, setQ] = useState('');
  const [modal, setModal] = useState(null); // {type:'form'|'adjust'|'delete', p}
  const [err, setErr] = useState('');
  const load = () => api('/products?search=' + encodeURIComponent(q.trim())).then(setRows).catch((e) => setErr(e.message));
  useEffect(() => { const t = setTimeout(load, 200); return () => clearTimeout(t); }, [q]);
  const saved = (msg) => { setModal(null); notify(msg); load(); };
  async function del(p) {
    try { await api('/products/' + p.id, { method: 'DELETE' }); saved('Product deleted'); } catch (e) { setErr(e.message); setModal(null); }
  }
  return (
    <>
      <div className="mb-5 flex items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold">Products</h1>
        <Btn kind="primary" onClick={() => setModal({ type: 'form' })}>Add product</Btn>
      </div>
      <Err msg={err} />
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <div className="border-b border-slate-200 p-3">
          <input type="search" aria-label="Search products" placeholder="Search by name or SKU" className="w-full rounded border border-slate-300 px-3 py-2" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="text-slate-500"><tr><th className="px-4 py-2">Name</th><th className="px-4 py-2">SKU</th><th className="px-4 py-2 text-right">Quantity</th><th className="px-4 py-2">Stock</th><th className="px-4 py-2 text-right">Selling price</th><th></th></tr></thead>
            <tbody>
              {rows && rows.map((p) => (
                <tr key={p.id} className="border-t border-slate-200">
                  <td className="px-4 py-2.5">{p.name}</td><td className="px-4 py-2.5">{p.sku}</td>
                  <td className="px-4 py-2.5 text-right">{p.quantity}</td>
                  <td className="px-4 py-2.5">{p.isLowStock ? <span className="rounded bg-yellow-300 px-2 py-0.5 text-xs font-extrabold text-yellow-950">Low stock</span> : <span className="text-slate-500">In stock</span>}</td>
                  <td className="px-4 py-2.5 text-right">{money(p.sellingPrice)}</td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-right">
                    <Btn className="mr-1 !px-2 !py-1" onClick={() => setModal({ type: 'adjust', p })}>Adjust</Btn>
                    <Btn className="mr-1 !px-2 !py-1" onClick={() => setModal({ type: 'form', p })}>Edit</Btn>
                    <Btn className="!px-2 !py-1 !text-red-700" onClick={() => setModal({ type: 'delete', p })}>Delete</Btn>
                  </td>
                </tr>
              ))}
              {rows && !rows.length && <tr><td colSpan="6" className="p-5 text-slate-600">{q ? 'No products match your search.' : 'No products yet. Select “Add product” to create one.'}</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
      {modal?.type === 'form' && <ProductForm product={modal.p} defaultThreshold={org.defaultLowStockThreshold} onSaved={saved} onClose={() => setModal(null)} />}
      {modal?.type === 'adjust' && <AdjustForm product={modal.p} onSaved={saved} onClose={() => setModal(null)} />}
      {modal?.type === 'delete' && (
        <Modal title="Delete product?" onClose={() => setModal(null)}>
          <p className="mb-4">“{modal.p.name}” ({modal.p.sku}) will be removed permanently.</p>
          <div className="flex justify-end gap-2"><Btn onClick={() => setModal(null)}>Cancel</Btn><Btn kind="danger" onClick={() => del(modal.p)}>Delete product</Btn></div>
        </Modal>
      )}
    </>
  );
}

// ---------------- Settings (FR-7) ----------------
function Settings({ org, onOrg, notify }) {
  const [v, setV] = useState(org.defaultLowStockThreshold);
  const [err, setErr] = useState('');
  async function submit(e) {
    e.preventDefault();
    setErr('');
    try {
      const r = await api('/settings', { method: 'PUT', body: { defaultLowStockThreshold: v } });
      onOrg({ ...org, defaultLowStockThreshold: r.defaultLowStockThreshold });
      notify('Settings saved');
    } catch (e2) { setErr(e2.message); }
  }
  return (
    <>
      <h1 className="mb-5 text-2xl font-extrabold">Settings</h1>
      <form onSubmit={submit} noValidate className="max-w-md rounded-lg border border-slate-200 bg-white p-5">
        <Field label="Default low-stock threshold" hint="— used when a product has no threshold of its own" type="number" min="0" step="1" value={v} onChange={(e) => setV(e.target.value)} />
        <Err msg={err} />
        <Btn kind="primary">Save settings</Btn>
      </form>
    </>
  );
}

// ---------------- App shell ----------------
function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(!!localStorage.getItem('sf_token'));
  const [page, setPage] = useState(location.hash.slice(1) || 'dashboard');
  const [toast, setToast] = useState('');

  useEffect(() => {
    if (localStorage.getItem('sf_token')) api('/me').then(setSession).catch(() => {}).finally(() => setLoading(false));
    const out = () => setSession(null);
    const hash = () => setPage(location.hash.slice(1) || 'dashboard');
    window.addEventListener('sf-logout', out);
    window.addEventListener('hashchange', hash);
    return () => { window.removeEventListener('sf-logout', out); window.removeEventListener('hashchange', hash); };
  }, []);

  const notify = (m) => { setToast(m); setTimeout(() => setToast(''), 2200); };
  if (loading) return <p className="p-8 text-slate-600">Loading…</p>;
  if (!session) return <AuthPage onAuth={setSession} />;

  const org = session.organization;
  const tabs = ['dashboard', 'products', 'settings'];
  const cur = tabs.includes(page) ? page : 'dashboard';
  return (
    <>
      <header className="bg-teal-900 text-white">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-4 px-5 py-3">
          <span className="mr-auto text-xl font-extrabold tracking-tight">StockFlow</span>
          <nav className="flex gap-1">
            {tabs.map((t) => (
              <a key={t} href={'#' + t} className={'rounded px-3 py-1.5 capitalize ' + (t === cur ? 'bg-white/20 font-semibold' : 'opacity-80 hover:opacity-100')}>{t}</a>
            ))}
          </nav>
          <span className="text-sm opacity-90">{org.name}</span>
          <button className="rounded border border-white/40 px-3 py-1 text-sm" onClick={() => { localStorage.removeItem('sf_token'); setSession(null); location.hash = ''; }}>Log out</button>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-5 py-7 pb-16">
        {cur === 'dashboard' && <Dashboard />}
        {cur === 'products' && <Products org={org} notify={notify} />}
        {cur === 'settings' && <Settings org={org} onOrg={(o) => setSession({ ...session, organization: o })} notify={notify} />}
      </main>
      {toast && <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded bg-slate-900 px-4 py-2 font-semibold text-white">{toast}</div>}
    </>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
