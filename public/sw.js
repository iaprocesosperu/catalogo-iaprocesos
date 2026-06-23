const SHARE_CACHE='share-target-v1'

self.addEventListener('install',e=>self.skipWaiting())
self.addEventListener('activate',e=>e.waitUntil(self.clients.claim()))

self.addEventListener('fetch',e=>{
  const url=new URL(e.request.url)

  // Interceptar el POST del Share Target
  if(e.request.method==='POST'&&url.searchParams.get('share')==='true'){
    e.respondWith(handleShare(e.request))
    return
  }

  // Resto: red normal
  e.respondWith(fetch(e.request).catch(()=>caches.match(e.request)))
})

async function handleShare(request){
  try{
    const data=await request.formData()
    const file=data.get('image')
    if(file&&file.size>0){
      const cache=await caches.open(SHARE_CACHE)
      await cache.put('/shared-photo',new Response(file,{
        headers:{'Content-Type':file.type||'image/jpeg'}
      }))
    }
  }catch(e){}
  // Redirigir a la app con flag distinto para no crear loop
  return Response.redirect('/?shared=true',303)
}
