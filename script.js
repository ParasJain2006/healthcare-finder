let map;
let markers = [];
let userLat, userLon;

// Initialize map at default location
function initMap(lat=28.6139, lon=77.2090){
    map = L.map('map').setView([lat, lon], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{
        attribution:'&copy; OpenStreetMap contributors'
    }).addTo(map);
}

// Distance calculation
function getDistance(lat1, lon1, lat2, lon2){
    const R = 6371; // km
    const dLat = (lat2-lat1)*Math.PI/180;
    const dLon = (lon2-lon1)*Math.PI/180;
    const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
    const c = 2*Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return (R*c).toFixed(2);
}

// Fetch nearby places
async function findNearby(lat, lon, type){
    // Clear existing markers and list
    markers.forEach(m => map.removeLayer(m));
    markers = [];
    document.getElementById('place-list').innerHTML = '';

    let overpassQuery;
    if(type==='hospital'){
        overpassQuery = `
            [out:json][timeout:25];
            (
              node["amenity"="hospital"](around:15000,${lat},${lon});
              way["amenity"="hospital"](around:15000,${lat},${lon});
            );
            out center;
        `;
    } else if(type==='doctor'){
        overpassQuery = `
            [out:json][timeout:25];
            (
              node["amenity"="clinic"](around:15000,${lat},${lon});
              node["healthcare"="doctor"](around:15000,${lat},${lon});
              node["healthcare"="general_practitioner"](around:15000,${lat},${lon});
              way["amenity"="clinic"](around:15000,${lat},${lon});
              way["healthcare"="doctor"](around:15000,${lat},${lon});
            );
            out center;
        `;
    } else if(type==='pharmacy'){
        overpassQuery = `
            [out:json][timeout:25];
            (
              node["amenity"="pharmacy"](around:15000,${lat},${lon});
              node["shop"="chemist"](around:15000,${lat},${lon});
              node["shop"="medical_supply"](around:15000,${lat},${lon});
              way["amenity"="pharmacy"](around:15000,${lat},${lon});
              way["shop"="chemist"](around:15000,${lat},${lon});
              way["shop"="medical_supply"](around:15000,${lat},${lon});
            );
            out center;
        `;
    }
    else if(type==='bloodbank'){
    overpassQuery = `
        [out:json][timeout:25];
        (
          node["amenity"="blood_donation"](around:15000,${lat},${lon});
          node["healthcare"="blood_bank"](around:15000,${lat},${lon});
          way["amenity"="blood_donation"](around:15000,${lat},${lon});
          way["healthcare"="blood_bank"](around:15000,${lat},${lon});
        );
        out center;
    `;
}
    const res = await fetch("https://overpass-api.de/api/interpreter", {method:'POST', body:overpassQuery});
    const data = await res.json();

    if(!data.elements.length){
        alert('No places found nearby!');
        return;
    }

    // Prepare array with distance
    let places = data.elements.map(place => {
        const plat = place.lat || place.center.lat;
        const plon = place.lon || place.center.lon;
        const name = place.tags.name || type;
        const distance = getDistance(lat, lon, plat, plon);
        return {plat, plon, name, distance};
    });

    // Sort by distance (nearest first)
    places.sort((a,b) => a.distance - b.distance);

    // Add markers and sidebar
    places.forEach(p => {
        const icon = L.icon({
        iconUrl: type==='hospital'?'https://img.icons8.com/color/48/000000/hospital.png':
             type==='doctor'?'https://img.icons8.com/color/48/000000/stethoscope.png':
             type==='pharmacy'?'https://img.icons8.com/color/48/000000/pharmacy.png':
             'https://img.icons8.com/color/48/000000/blood-bank.png', // Blood Bank icon
    iconSize:[32,32],
    iconAnchor:[16,32],
    popupAnchor:[0,-32]
});


        const marker = L.marker([p.plat, p.plon], {icon}).addTo(map)
                        .bindPopup(`<b>${p.name}</b><br>Distance: ${p.distance} km`);
        markers.push(marker);

        // Sidebar list
        const li = document.createElement('li');
        li.innerHTML = `<b>${p.name}</b> - ${p.distance} km`;
        li.onclick = ()=>{ map.setView([p.plat,p.plon],16); marker.openPopup(); }
        document.getElementById('place-list').appendChild(li);
    });
}

// Detect user location
document.getElementById('search-btn').addEventListener('click', ()=>{
    const type = document.getElementById('place-type').value;
    if(navigator.geolocation){
        navigator.geolocation.getCurrentPosition(pos=>{
            userLat = pos.coords.latitude;
            userLon = pos.coords.longitude;
            map.setView([userLat, userLon],14);
            findNearby(userLat, userLon, type);
        }, error=>{
            alert('Could not detect location. Using default (Delhi).');
            userLat = 28.6139;
            userLon = 77.2090;
            findNearby(userLat, userLon, type);
        });
    } else{
        alert('Geolocation not supported. Using default (Delhi).');
        userLat = 28.6139;
        userLon = 77.2090;
        findNearby(userLat, userLon, type);
    }
});

// Initialize map
initMap();
