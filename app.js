// ======================= GLOBAL VARIABLES =======================
let map;
let routingControl = null;
let markersLayer;
let tpsMarkers = {};
let userLocationMarker = null;
let selectedTpsIds = new Set();
let currentUserLocation = null;
let routeFromUserActive = false;
let watchId = null; // Untuk menyimpan ID watcher posisi
let isTrackingActive = false; // Status tracking
let hasUnsavedChanges = false; // Flag untuk mendeteksi perubahan yang belum disimpan

// ======================= INISIALISASI PETA BERWARNA =======================
function initMap() {
    map = L.map('map').setView([-7.02, 110.41], 12);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 19,
        minZoom: 10
    }).addTo(map);

    const satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Esri, DigitalGlobe',
        maxZoom: 18
    });
    const streetLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: 'OpenStreetMap'
    });
    
    const baseMaps = {
        "🎨 Peta Berwarna (Voyager)": L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png'),
        "🛰️ Satelit": satelliteLayer,
        "🗺️ Street Map": streetLayer
    };
    L.control.layers(baseMaps).addTo(map);

    const tpaIcon = L.divIcon({
        html: '<div style="background: linear-gradient(135deg, #e74c3c, #c0392b); width: 38px; height: 38px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(0,0,0,0.3); border: 3px solid white;"><i class="fas fa-industry" style="color:white; font-size: 16px;"></i></div>',
        iconSize: [38, 38]
    });
    L.marker([TPA.lat, TPA.lng], { icon: tpaIcon })
        .bindPopup('<b>🏭 TPA Jatibarang</b><br>Tempat Pemrosesan Akhir Sampah Kota Semarang')
        .addTo(map);

    markersLayer = L.layerGroup();
    markersLayer.addTo(map);
    updateAllMarkers();
}

function updateAllMarkers() {
    markersLayer.clearLayers();
    tpsMarkers = {};
    
    window.tpsData.forEach(tps => {
        const icon = L.divIcon({
            html: '<div style="background: linear-gradient(135deg, #27ae60, #2ecc71); width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 6px rgba(0,0,0,0.2); border: 2px solid white;"><i class="fas fa-trash-alt" style="color:white; font-size: 13px;"></i></div>',
            iconSize: [30, 30]
        });
        const marker = L.marker([tps.lat, tps.lng], { icon })
            .bindPopup(`<b>🗑️ ${tps.name}</b><br>📍 ${tps.address}<br>📏 Klik untuk rute ke TPA`);
        marker.addTo(markersLayer);
        tpsMarkers[tps.id] = marker;
    });
}

function clearRoute() {
    if (routingControl) {
        map.removeControl(routingControl);
        routingControl = null;
    }
}

// ======================= MULTI-STOP ROUTING =======================
function showMultiRoute(waypoints) {
    clearRoute();
    if (waypoints.length < 2) return;
    
    routingControl = L.Routing.control({
        waypoints: waypoints,
        router: L.Routing.osrmv1({
            serviceUrl: 'https://router.project-osrm.org/route/v1',
            profile: 'driving'
        }),
        lineOptions: {
            styles: [{ color: '#f59e0b', weight: 6, opacity: 0.9, dashArray: '8, 8' }]
        },
        show: true,
        collapsible: true,
        addWaypoints: false,
        draggableWaypoints: false,
        fitSelectedRoutes: true,
        showDistances: true,
        showTotalTime: true
    }).addTo(map);
}

// ======================= RUTE DARI LOKASI PENGGUNA =======================
function showRouteFromUserToSelectedTPS() {
    if (!currentUserLocation) {
        Swal.fire({
            title: 'Lokasi tidak ditemukan',
            text: 'Silakan klik tombol "Lokasi Saya" terlebih dahulu',
            icon: 'info',
            confirmButtonText: 'OK'
        });
        return;
    }
    
    if (selectedTpsIds.size === 0) {
        Swal.fire({
            title: 'Tidak ada TPS dipilih',
            text: 'Silakan pilih minimal 1 TPS terlebih dahulu',
            icon: 'info',
            confirmButtonText: 'OK'
        });
        return;
    }
    
    const selectedTps = window.tpsData.filter(t => selectedTpsIds.has(t.id));
    const waypoints = [
        L.latLng(currentUserLocation.lat, currentUserLocation.lng),
        ...selectedTps.map(t => L.latLng(t.lat, t.lng)),
        L.latLng(TPA.lat, TPA.lng)
    ];
    
    clearRoute();
    
    routingControl = L.Routing.control({
        waypoints: waypoints,
        router: L.Routing.osrmv1({
            serviceUrl: 'https://router.project-osrm.org/route/v1',
            profile: 'driving'
        }),
        lineOptions: {
            styles: [{ color: '#3498db', weight: 6, opacity: 0.9, dashArray: '5, 10' }]
        },
        show: true,
        collapsible: true,
        addWaypoints: false,
        draggableWaypoints: false,
        fitSelectedRoutes: true,
        showDistances: true,
        showTotalTime: true,
        totalTimeFormatter: function(durationSec) {
            const minutes = Math.floor(durationSec / 60);
            return `${minutes} menit`;
        },
        createMarker: function() { return null; }
    }).addTo(map);
    
    Swal.fire({
        title: '🚛 Rute dari Lokasi Anda',
        html: `<strong>${selectedTps.length} TPS</strong> akan dilewati menuju TPA<br>
               <small>🗺️ Rute berwarna BIRU</small>`,
        icon: 'success',
        timer: 2000,
        showConfirmButton: false
    });
}

function resetToNormalRoute() {
    clearRoute();
    Swal.fire('Rute direset', 'Silakan pilih TPS dan klik "Optimasi Rute Multi-TPS" untuk rute normal', 'info');
}

// ======================= RENDER SIDEBAR =======================
function renderSidebar() {
    let filtered = [...window.tpsData];
    const search = document.getElementById('searchInput').value.toLowerCase();
    if (search) {
        filtered = filtered.filter(t => 
            t.name.toLowerCase().includes(search) || 
            t.address.toLowerCase().includes(search)
        );
    }

    const sortBy = document.getElementById('sortBy').value;
    filtered.sort((a, b) => {
        if (sortBy === 'name') return a.name.localeCompare(b.name);
        if (sortBy === 'distance') {
            const distA = haversineDistance(a.lat, a.lng, TPA.lat, TPA.lng);
            const distB = haversineDistance(b.lat, b.lng, TPA.lat, TPA.lng);
            return distA - distB;
        }
        if (sortBy === 'distanceFar') {
            const distA = haversineDistance(a.lat, a.lng, TPA.lat, TPA.lng);
            const distB = haversineDistance(b.lat, b.lng, TPA.lat, TPA.lng);
            return distB - distA;
        }
        return 0;
    });

    const container = document.getElementById('tpsListContainer');
    container.innerHTML = '';
    
    filtered.forEach(tps => {
        const dist = haversineDistance(tps.lat, tps.lng, TPA.lat, TPA.lng);
        const isSelected = selectedTpsIds.has(tps.id);
        const card = document.createElement('div');
        card.className = 'tps-card';
        card.innerHTML = `
            <div class="tps-name">
                <label style="cursor:pointer; display:flex; gap:12px; align-items:center; width:100%;">
                    <input type="checkbox" class="tps-checkbox" data-id="${tps.id}" ${isSelected ? 'checked' : ''}>
                    <strong><i class="fas fa-location-dot"></i> ${tps.name}</strong>
                </label>
            </div>
            <div class="tps-address">${tps.address}</div>
            <small>📏 Jarak ke TPA: ${dist} km (garis lurus)</small>
        `;
        const checkbox = card.querySelector('.tps-checkbox');
        checkbox.addEventListener('change', (e) => {
            e.stopPropagation();
            if (e.target.checked) {
                selectedTpsIds.add(tps.id);
            } else {
                selectedTpsIds.delete(tps.id);
            }
            document.getElementById('selectedCount').innerText = selectedTpsIds.size;
        });
        container.appendChild(card);
    });
    
    document.getElementById('totalTPS').innerText = window.tpsData.length;
    document.getElementById('selectedCount').innerText = selectedTpsIds.size;
}

function haversineDistance(lat1, lng1, lat2, lng2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng / 2) ** 2;
    return (R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))).toFixed(1);
}

// ======================= CRUD FUNCTIONS (DENGAN UNSAVED CHANGES TRACKING) =======================
function markUnsavedChanges() {
    hasUnsavedChanges = true;
    // Tampilkan indikator di sidebar header
    const header = document.querySelector('.sidebar-header p');
    if (header && !header.querySelector('.unsaved-badge')) {
        header.innerHTML += ' <span class="unsaved-badge" style="background:#e74c3c; padding:2px 8px; border-radius:20px; font-size:10px; margin-left:8px;">⚠️ Belum Disimpan</span>';
    }
}

function clearUnsavedIndicator() {
    hasUnsavedChanges = false;
    const badge = document.querySelector('.unsaved-badge');
    if (badge) badge.remove();
}

function addTps() {
    Swal.fire({
        title: 'Tambah TPS Baru',
        html: `<input id="name" class="swal2-input" placeholder="Nama TPS">
               <input id="lat" class="swal2-input" placeholder="Latitude (contoh: -7.0000)">
               <input id="lng" class="swal2-input" placeholder="Longitude (contoh: 110.4000)">
               <input id="addr" class="swal2-input" placeholder="Alamat lengkap">`,
        preConfirm: () => {
            const name = document.getElementById('name').value;
            const lat = parseFloat(document.getElementById('lat').value);
            const lng = parseFloat(document.getElementById('lng').value);
            const addr = document.getElementById('addr').value;
            if (!name || isNaN(lat) || isNaN(lng)) {
                Swal.showValidationMessage('Isi semua data dengan benar');
            }
            return { name, lat, lng, address: addr };
        }
    }).then(res => {
        if (res.isConfirmed) {
            window.tpsData.push({
                id: window.nextId++,
                ...res.value
            });
            updateAllMarkers();
            renderSidebar();
            markUnsavedChanges();
            Swal.fire('Berhasil!', 'TPS baru ditambahkan (belum tersimpan permanen)', 'success');
        }
    });
}

function editTps() {
    if (selectedTpsIds.size !== 1) {
        return Swal.fire('Peringatan', 'Pilih tepat 1 TPS untuk diedit', 'info');
    }
    const tps = window.tpsData.find(t => t.id === Array.from(selectedTpsIds)[0]);
    Swal.fire({
        title: 'Edit TPS',
        html: `<input id="name" class="swal2-input" value="${tps.name}">
               <input id="lat" class="swal2-input" value="${tps.lat}">
               <input id="lng" class="swal2-input" value="${tps.lng}">
               <input id="addr" class="swal2-input" value="${tps.address}">`,
        preConfirm: () => {
            return {
                name: document.getElementById('name').value,
                lat: parseFloat(document.getElementById('lat').value),
                lng: parseFloat(document.getElementById('lng').value),
                address: document.getElementById('addr').value
            };
        }
    }).then(res => {
        if (res.isConfirmed) {
            Object.assign(tps, res.value);
            updateAllMarkers();
            renderSidebar();
            markUnsavedChanges();
            Swal.fire('Berhasil!', 'Data TPS diperbarui (belum tersimpan permanen)', 'success');
        }
    });
}

function deleteTps() {
    if (selectedTpsIds.size === 0) {
        return Swal.fire('Peringatan', 'Pilih minimal 1 TPS untuk dihapus', 'info');
    }
    Swal.fire({
        title: 'Hapus TPS?',
        text: `${selectedTpsIds.size} TPS akan dihapus permanen`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#e74c3c'
    }).then(res => {
        if (res.isConfirmed) {
            window.tpsData = window.tpsData.filter(t => !selectedTpsIds.has(t.id));
            selectedTpsIds.clear();
            updateAllMarkers();
            renderSidebar();
            clearRoute();
            markUnsavedChanges();
            Swal.fire('Terhapus!', 'TPS berhasil dihapus (belum tersimpan permanen)', 'success');
        }
    });
}

// ======================= SIMPAN PERMANEN DATA =======================
function saveDataPermanently() {
    if (!hasUnsavedChanges) {
        Swal.fire({
            title: 'ℹ️ Tidak Ada Perubahan',
            text: 'Tidak ada perubahan data yang perlu disimpan',
            icon: 'info',
            timer: 1500,
            showConfirmButton: false
        });
        return;
    }
    
    saveDataToStorage(true).then(() => {
        clearUnsavedIndicator();
    }).catch(() => {
        // Password salah atau dibatalkan - data tetap di memory tapi tidak ke localStorage
        console.log("Penyimpanan dibatalkan atau password salah");
    });
}

// ======================= MULTI RUTE OPTIMASI =======================
function multiRouteOptimize() {
    if (selectedTpsIds.size === 0) {
        return Swal.fire('Peringatan', 'Pilih minimal 1 TPS untuk rute multi-stop', 'info');
    }
    const selectedTps = window.tpsData.filter(t => selectedTpsIds.has(t.id));
    const waypoints = selectedTps.map(t => L.latLng(t.lat, t.lng));
    waypoints.push(L.latLng(TPA.lat, TPA.lng));
    showMultiRoute(waypoints);
    Swal.fire('Sukses!', `Rute optimal untuk ${selectedTps.length} TPS menuju TPA Jatibarang`, 'success');
}

// ======================= GEOLOKASI PENGGUNA DENGAN LIVE TRACKING =======================
function updateUserLocationMarker(latlng) {
    currentUserLocation = {
        lat: latlng.lat,
        lng: latlng.lng
    };
    
    if (userLocationMarker) {
        userLocationMarker.setLatLng(latlng);
        userLocationMarker.setPopupContent(`<b>📍 Lokasi Anda (Live)</b><br><small>Lat: ${latlng.lat.toFixed(5)}<br>Lng: ${latlng.lng.toFixed(5)}<br>🟢 Tracking aktif</small>`);
    } else {
        userLocationMarker = L.marker(latlng, {
            icon: L.divIcon({
                html: '<div style="background:#3498db; width:20px; height:20px; border-radius:50%; border:2px solid white; box-shadow:0 0 0 3px rgba(52,152,219,0.5); animation: pulse 1.5s infinite;"></div>',
                iconSize: [20, 20],
                className: 'user-location-marker'
            })
        }).bindPopup(`<b>📍 Lokasi Anda (Live)</b><br><small>Lat: ${latlng.lat.toFixed(5)}<br>Lng: ${latlng.lng.toFixed(5)}<br>🟢 Tracking aktif</small>`).addTo(map);
    }
}

function stopLocationTracking() {
    if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
        watchId = null;
    }
    isTrackingActive = false;
    
    const locationBtn = document.getElementById('locationBtn');
    locationBtn.innerHTML = '<i class="fas fa-location-dot"></i> Lokasi Saya';
    locationBtn.style.background = 'rgba(255, 255, 255, 0.2)';
    
    Swal.fire({
        title: 'Tracking Berhenti',
        text: 'Lokasi tidak akan mengikuti pergerakan Anda lagi',
        icon: 'info',
        timer: 1500,
        showConfirmButton: false
    });
}

function startLocationTracking() {
    if (!navigator.geolocation) {
        Swal.fire('Error', 'Browser Anda tidak mendukung geolokasi', 'error');
        return;
    }
    
    if (watchId !== null) {
        stopLocationTracking();
    }
    
    watchId = navigator.geolocation.watchPosition(
        (position) => {
            const latlng = L.latLng(position.coords.latitude, position.coords.longitude);
            updateUserLocationMarker(latlng);
            
            if (!isTrackingActive) {
                map.setView(latlng, 15);
                Swal.fire({
                    title: 'Live Tracking Aktif!',
                    html: '📍 Peta akan mengikuti pergerakan Anda<br><small>Tekan tombol "Lokasi Saya" lagi untuk berhenti</small>',
                    icon: 'success',
                    timer: 2000,
                    showConfirmButton: false
                });
            }
            
            isTrackingActive = true;
            
            if (routingControl && routeFromUserActive) {
                const currentWaypoints = routingControl.getWaypoints();
                if (currentWaypoints && currentWaypoints.length > 0) {
                    currentWaypoints[0] = L.latLng(latlng.lat, latlng.lng);
                    routingControl.setWaypoints(currentWaypoints);
                }
            }
        },
        (error) => {
            console.error('Geolocation error:', error);
            let errorMessage = 'Gagal mendapatkan lokasi. ';
            switch(error.code) {
                case error.PERMISSION_DENIED:
                    errorMessage += 'Izin lokasi ditolak.';
                    break;
                case error.POSITION_UNAVAILABLE:
                    errorMessage += 'Informasi lokasi tidak tersedia.';
                    break;
                case error.TIMEOUT:
                    errorMessage += 'Waktu permintaan lokasi habis.';
                    break;
                default:
                    errorMessage += 'Terjadi kesalahan.';
            }
            Swal.fire('Gagal', errorMessage, 'error');
            stopLocationTracking();
        },
        {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
        }
    );
    
    const locationBtn = document.getElementById('locationBtn');
    locationBtn.innerHTML = '<i class="fas fa-sync-alt fa-spin"></i> Live Tracking ON';
    locationBtn.style.background = '#27ae60';
}

function locateUser() {
    if (isTrackingActive && watchId !== null) {
        stopLocationTracking();
    } else {
        startLocationTracking();
    }
}

// ======================= DARK MODE =======================
function toggleDarkMode() {
    document.body.classList.toggle('dark-mode');
    document.body.classList.toggle('light-mode');
    const btn = document.getElementById('darkModeBtn');
    if (document.body.classList.contains('dark-mode')) {
        btn.innerHTML = '<i class="fas fa-sun"></i> Light Mode';
    } else {
        btn.innerHTML = '<i class="fas fa-moon"></i> Dark Mode';
    }
}

// ======================= TAMBAHAN TOMBOL RUTE & SAVE =======================
function addExtraButtons() {
    if (document.getElementById('routeFromUserBtn')) return;
    
    const multiRoutePanel = document.querySelector('.multi-route-panel');
    if (multiRoutePanel) {
        const buttonGroup = document.createElement('div');
        buttonGroup.style.display = 'flex';
        buttonGroup.style.gap = '10px';
        buttonGroup.style.marginTop = '10px';
        buttonGroup.style.flexDirection = 'column';
        
        buttonGroup.innerHTML = `
            <button class="btn-sm" id="routeFromUserBtn" style="background:#3498db; width:100%;">
                <i class="fas fa-location-dot"></i> 🚛 Rute dari Lokasi Saya ke TPS
            </button>
            <button class="btn-sm" id="resetRouteBtn" style="background:#6c757d; width:100%;">
                <i class="fas fa-undo-alt"></i> Reset Rute
            </button>
            <button class="btn-sm" id="saveDataBtn" style="background:#27ae60; width:100%;">
                <i class="fas fa-save"></i> 💾 Simpan Data Permanen
            </button>
            <button class="btn-sm" id="resetDataBtn" style="background:#e74c3c; width:100%;">
                <i class="fas fa-undo-alt"></i> 🔄 Reset ke Data Default
            </button>
        `;
        
        multiRoutePanel.appendChild(buttonGroup);
        
        document.getElementById('routeFromUserBtn').onclick = () => {
            routeFromUserActive = true;
            showRouteFromUserToSelectedTPS();
        };
        document.getElementById('resetRouteBtn').onclick = () => {
            routeFromUserActive = false;
            resetToNormalRoute();
        };
        document.getElementById('saveDataBtn').onclick = saveDataPermanently;
        document.getElementById('resetDataBtn').onclick = resetToDefaultData;
    }
}

// Animasi pulse untuk marker
function addPulseAnimation() {
    const style = document.createElement('style');
    style.textContent = `
        @keyframes pulse {
            0% {
                box-shadow: 0 0 0 0 rgba(52, 152, 219, 0.7);
            }
            70% {
                box-shadow: 0 0 0 10px rgba(52, 152, 219, 0);
            }
            100% {
                box-shadow: 0 0 0 0 rgba(52, 152, 219, 0);
            }
        }
        .user-location-marker div {
            animation: pulse 1.5s infinite;
        }
    `;
    document.head.appendChild(style);
}

// Peringatan sebelum refresh/keluar jika ada perubahan belum disimpan
function warnBeforeUnload() {
    window.addEventListener('beforeunload', (e) => {
        if (hasUnsavedChanges) {
            e.preventDefault();
            e.returnValue = 'Anda memiliki perubahan data TPS yang belum disimpan permanen. Masukkan password "ayam jago" untuk menyimpan, atau data akan hilang. Apakah Anda yakin ingin meninggalkan halaman?';
            return e.returnValue;
        }
    });
}

// ======================= EVENT LISTENERS =======================
document.getElementById('addTpsBtn').onclick = addTps;
document.getElementById('editTpsBtn').onclick = editTps;
document.getElementById('deleteTpsBtn').onclick = deleteTps;
document.getElementById('multiRouteBtn').onclick = multiRouteOptimize;
document.getElementById('locationBtn').onclick = locateUser;
document.getElementById('darkModeBtn').onclick = toggleDarkMode;
document.getElementById('searchInput').addEventListener('input', () => renderSidebar());
document.getElementById('sortBy').addEventListener('change', () => renderSidebar());

// ======================= INITIALIZATION =======================
window.onload = () => {
    initMap();
    renderSidebar();
    addExtraButtons();
    addPulseAnimation();
    warnBeforeUnload();
    
    window.addEventListener('beforeunload', () => {
        if (watchId !== null) {
            navigator.geolocation.clearWatch(watchId);
        }
    });
};
