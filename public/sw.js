self.addEventListener('install',e=>self.skipWaiting())
self.addEventListener('activate',e=>e.waitUntil(self.clients.claim()))
self.addEventListener('fetch',e=>{if(e.request.method==='POST'&&e.request.url.includes('share=true')){e.respondWith(Response.redirect('/?share=true'))}})
