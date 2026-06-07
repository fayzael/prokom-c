// ======================= GLOBAL VARIABLES =======================
let map;
let routingControl = null;
let markersLayer;
let tpsMarkers = {};
let userLocationMarker = null;
let selectedTpsIds = new Set();
let currentUserLocation = null;
let routeFromUserActive = false;
let watchId = null;
let isTrackingActive = false;
let hasUnsavedChanges = false;

// ======================= CEK PROTOCOL & HTTPS =======================
function checkProtocol() {
    const warningDiv = document.getElementById('httpsWarning');
    const warningMsg = document.getElementById('warningMessage');
    
    if (location.protocol === 'file:') {
        warningDiv.style.display = 'block';
        warningMsg.innerHTML = '⚠️ Geolocation TIDAK akan berfungsi. <a href="https://dancing-klepon-93f821.netlify.app" target="_blank">Klik di sini untuk buka versi online</a>';
        warningDiv.style.background = '#e74c3c';
        return false;
    } else if (location.protocol === 'http:' && location.hostname !== 'localhost' && !location.hostname.includes('127.0.0.1')) {
        warningDiv.style.display = 'block';
        warningMsg.innerHTML = '⚠️ Koneksi tidak aman (HTTP). Gunakan HTTPS untuk hasil terbaik.';
        warningDiv.style.background = '#f39c12';
        return false;
    } else {
        warningDiv.style.display = 'none';
        return true;
    }
}

// ======================= FUNGSI MAP =======================
function initMap() {
    map = L.map('map').setView([-7.02, 110.41], 12);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
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
        "🎨 Peta Berwarna": L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png'),
        "🛰️ Satelit": satelliteLayer,
        "🗺️ Street Map": streetLayer
    };
    L.control.layers(baseMaps).addTo(map);

    const tpaIcon = L.divIcon({
        html: '<div style="background: linear-gradient(135deg, #e74c3c, #c0392b); width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(0,0,0,0.3); border: 2px solid white;"><i class="fas fa-industry" style="color:white; font-size: 14px;"></i></div>',
        iconSize: [34, 34]
    });
    L.marker([TPA.lat, TPA.lng], { icon: tpaIcon })
        .bindPopup('<b>🏭 TPA Jatibarang</b><br>Tempat Pemrosesan Akhir Sampah')
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
            html: '<div style="background: linear-gradient(135deg, #27ae60, #2ecc71); width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 6px rgba(0,0,0,0.2); border: 2px solid white;"><i class="fas fa-trash-alt" style="color:white; font-size: 12px;"></i></div>',
            iconSize: [28, 28]
        });
        const marker = L.marker([tps.lat, tps.lng], { icon })
            .bindPopup(`<b>🗑️ ${tps.name}</b><br>📍 ${tps.address}`);
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
            styles: [{ color: '#f59e0b', weight: 5, opacity: 0.9, dashArray: '8, 8' }]
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

function showRouteFromUserToSelectedTPS() {
    if (!currentUserLocation) {
        Swal.fire({
            title: 'Lokasi tidak ditemukan',
            text: 'Silakan klik tombol "Lokasi Saya" terlebih dahulu dan izinkan akses lokasi',
            icon: 'info'
        });
        return;
    }
    
    if (selectedTpsIds.size === 0) {
        Swal.fire({
            title: 'Tidak ada TPS dipilih',
            text: 'Silakan pilih minimal 1 TPS terlebih dahulu',
            icon: 'info'
        });
        return;
    }
    
    const selectedTpsList = window.tpsData.filter(t => selectedTpsIds.has(t.id));
    const waypoints = [
        L.latLng(currentUserLocation.lat, currentUserLocation.lng),
        ...selectedTpsList.map(t => L.latLng(t.lat, t.lng)),
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
            styles: [{ color: '#3498db', weight: 5, opacity: 0.9, dashArray: '5, 10' }]
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
        html: `<strong>${selectedTpsList.length} TPS</strong> menuju TPA`,
        icon: 'success',
        timer: 1500,
        showConfirmButton: false
    });
}

function resetToNormalRoute() {
    clearRoute();
    Swal.fire('Rute direset', 'Silakan pilih TPS untuk rute baru', 'info');
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
                <label style="cursor:pointer; display:flex; gap:8px; align-items:center; width:100%;">
                    <input type="checkbox" class="tps-checkbox" data-id="${tps.id}" ${isSelected ? 'checked' : ''}>
                    <strong><i class="fas fa-location-dot"></i> ${tps.name}</strong>
                </label>
            </div>
            <div class="tps-address">${tps.address}</div>
            <small>📏 Jarak ke TPA: ${dist} km</small>
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

// ======================= CRUD FUNCTIONS =======================
function markUnsavedChanges() {
    hasUnsavedChanges = true;
    const header = document.querySelector('.sidebar-header p');
    if (header && !header.querySelector('.unsaved-badge')) {
        header.innerHTML += ' <span class="unsaved-badge">⚠️ Belum Disimpan</span>';
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
               <input id="lat" class="swal2-input" placeholder="Latitude">
               <input id="lng" class="swal2-input" placeholder="Longitude">
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
            Swal.fire('Berhasil!', 'TPS baru ditambahkan', 'success');
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
            Swal.fire('Berhasil!', 'Data TPS diperbarui', 'success');
        }
    });
}

function deleteTps() {
    if (selectedTpsIds.size === 0) {
        return Swal.fire('Peringatan', 'Pilih minimal 1 TPS untuk dihapus', 'info');
    }
    Swal.fire({
        title: 'Hapus TPS?',
        text: `${selectedTpsIds.size} TPS akan dihapus`,
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
            Swal.fire('Terhapus!', 'TPS berhasil dihapus', 'success');
        }
    });
}

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
    }).catch(() => {});
}

function multiRouteOptimize() {
    if (selectedTpsIds.size === 0) {
        return Swal.fire('Peringatan', 'Pilih minimal 1 TPS untuk rute', 'info');
    }
    const selectedTpsList = window.tpsData.filter(t => selectedTpsIds.has(t.id));
    const waypoints = selectedTpsList.map(t => L.latLng(t.lat, t.lng));
    waypoints.push(L.latLng(TPA.lat, TPA.lng));
    showMultiRoute(waypoints);
    Swal.fire('Sukses!', `Rute optimal untuk ${selectedTpsList.length} TPS`, 'success');
}

// ======================= GEOLOKASI LIVE TRACKING =======================
function updateUserLocationMarker(latlng) {
    currentUserLocation = {
        lat: latlng.lat,
        lng: latlng.lng
    };
    
    if (userLocationMarker) {
        userLocationMarker.setLatLng(latlng);
        userLocationMarker.setPopupContent(`<b>📍 Lokasi Anda</b><br>🟢 Live Tracking aktif<br>Lat: ${latlng.lat.toFixed(5)}<br>Lng: ${latlng.lng.toFixed(5)}`);
    } else {
        userLocationMarker = L.marker(latlng, {
            icon: L.divIcon({
                html: '<div style="background:#3498db; width:18px; height:18px; border-radius:50%; border:2px solid white; box-shadow:0 0 0 3px rgba(52,152,219,0.5);"></div>',
                iconSize: [18, 18],
                className: 'user-location-marker'
            })
        }).bindPopup(`<b>📍 Lokasi Anda</b><br>🟢 Live Tracking aktif`).addTo(map);
    }
}

function stopLocationTracking() {
    if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
        watchId = null;
    }
    isTrackingActive = false;
    
    const locationBtn = document.getElementById('locationBtn');
    locationBtn.innerHTML = '<i class="fas fa-location-dot"></i> Lokasi';
    locationBtn.style.background = 'rgba(255, 255, 255, 0.2)';
    
    Swal.fire({
        title: 'Tracking Berhenti',
        text: 'Lokasi tidak akan mengikuti pergerakan',
        icon: 'info',
        timer: 1500,
        showConfirmButton: false
    });
}

function startLocationTracking() {
    // Cek protocol terlebih dahulu
    if (location.protocol === 'file:') {
        Swal.fire({
            title: '⚠️ Tidak Bisa Mengakses Lokasi',
            html: 'Aplikasi dibuka langsung dari file.<br><br>📱 <strong>Klik link berikut agar dapat mengaktifkan geolocation:</strong><br><br>' +
                  '<a href="https://dancing-klepon-93f821.netlify.app" target="_blank" style="display:inline-block; background:#3498db; color:white; padding:10px 20px; border-radius:10px; text-decoration:none; margin:10px 0;">' +
                  '🌍 https://dancing-klepon-93f821.netlify.app</a><br><br>' +
                  '<small>Atau buka link tersebut di browser HP Anda</small>',
            icon: 'error',
            confirmButtonText: 'OK'
        });
        return;
    }
    
    if (!navigator.geolocation) {
        Swal.fire('Error', 'Browser Anda tidak mendukung geolokasi', 'error');
        return;
    }
    
    if (watchId !== null) {
        stopLocationTracking();
    }
    
    Swal.fire({
        title: 'Mengambil lokasi...',
        text: 'Mohon izinkan akses lokasi di browser Anda',
        icon: 'info',
        allowOutsideClick: false,
        didOpen: () => {
            Swal.showLoading();
        }
    });
    
    watchId = navigator.geolocation.watchPosition(
        (position) => {
            Swal.close();
            const latlng = L.latLng(position.coords.latitude, position.coords.longitude);
            updateUserLocationMarker(latlng);
            
            if (!isTrackingActive) {
                map.setView(latlng, 15);
                Swal.fire({
                    title: 'Live Tracking Aktif!',
                    text: 'Peta akan mengikuti pergerakan Anda',
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
            Swal.close();
            let errorMessage = '';
            let solution = '';
            
            switch(error.code) {
                case error.PERMISSION_DENIED:
                    errorMessage = 'Izin lokasi ditolak.';
                    solution = 'Silakan buka pengaturan browser/HP Anda dan izinkan akses lokasi untuk website ini, lalu refresh halaman.';
                    break;
                case error.POSITION_UNAVAILABLE:
                    errorMessage = 'Informasi lokasi tidak tersedia.';
                    solution = 'Pastikan GPS HP Anda aktif dan Anda berada di area dengan sinyal GPS yang baik.';
                    break;
                case error.TIMEOUT:
                    errorMessage = 'Waktu permintaan lokasi habis.';
                    solution = 'Coba lagi atau periksa koneksi internet Anda.';
                    break;
                default:
                    errorMessage = 'Terjadi kesalahan.';
                    solution = 'Coba refresh halaman dan izinkan akses lokasi.';
            }
            
            Swal.fire({
                title: '❌ Gagal Mendapatkan Lokasi',
                html: `<strong>${errorMessage}</strong><br><br>${solution}`,
                icon: 'error',
                confirmButtonText: 'OK'
            });
            
            stopLocationTracking();
        },
        {
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: 0
        }
    );
    
    const locationBtn = document.getElementById('locationBtn');
    locationBtn.innerHTML = '<i class="fas fa-sync-alt fa-spin"></i> Tracking';
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
        btn.innerHTML = '<i class="fas fa-sun"></i> Light';
    } else {
        btn.innerHTML = '<i class="fas fa-moon"></i> Dark';
    }
}

// ======================= TAMBAHAN TOMBOL =======================
function addExtraButtons() {
    if (document.getElementById('routeFromUserBtn')) return;
    
    const multiRoutePanel = document.querySelector('.multi-route-panel');
    if (multiRoutePanel) {
        const buttonGroup = document.createElement('div');
        buttonGroup.style.display = 'flex';
        buttonGroup.style.gap = '8px';
        buttonGroup.style.marginTop = '8px';
        buttonGroup.style.flexDirection = 'column';
        
        buttonGroup.innerHTML = `
            <button class="btn-sm" id="routeFromUserBtn" style="background:#3498db; width:100%;">
                <i class="fas fa-location-dot"></i> 🚛 Rute dari Lokasi Saya
            </button>
            <button class="btn-sm" id="resetRouteBtn" style="background:#6c757d; width:100%;">
                <i class="fas fa-undo-alt"></i> Reset Rute
            </button>
            <button class="btn-sm" id="resetDataBtn" style="background:#e74c3c; width:100%;">
                <i class="fas fa-undo-alt"></i> Reset Data Default
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
        document.getElementById('resetDataBtn').onclick = resetToDefaultData;
    }
}

function warnBeforeUnload() {
    window.addEventListener('beforeunload', (e) => {
        if (hasUnsavedChanges) {
            e.preventDefault();
            e.returnValue = 'Anda memiliki perubahan data yang belum disimpan.';
            return e.returnValue;
        }
    });
}

// Fungsi refresh setelah reset (dipanggil dari data.js)
window.refreshAfterReset = function() {
    selectedTpsIds.clear();
    updateAllMarkers();
    renderSidebar();
    clearRoute();
    hasUnsavedChanges = false;
    clearUnsavedIndicator();
};

// ======================= SIDEBAR TOGGLE UNTUK HP =======================
function initSidebarToggle() {
    const menuToggleBtn = document.getElementById('menuToggleBtn');
    const sidebar = document.getElementById('sidebar');
    
    if (menuToggleBtn) {
        menuToggleBtn.addEventListener('click', () => {
            sidebar.classList.toggle('open');
        });
        
        document.addEventListener('click', (e) => {
            if (window.innerWidth <= 768) {
                if (!sidebar.contains(e.target) && !menuToggleBtn.contains(e.target)) {
                    sidebar.classList.remove('open');
                }
            }
        });
    }
}

// ======================= EVENT LISTENERS =======================
function initEventListeners() {
    document.getElementById('addTpsBtn').onclick = addTps;
    document.getElementById('editTpsBtn').onclick = editTps;
    document.getElementById('deleteTpsBtn').onclick = deleteTps;
    document.getElementById('multiRouteBtn').onclick = multiRouteOptimize;
    document.getElementById('locationBtn').onclick = locateUser;
    document.getElementById('darkModeBtn').onclick = toggleDarkMode;
    document.getElementById('saveDataHeaderBtn').onclick = saveDataPermanently;
    document.getElementById('searchInput').addEventListener('input', () => renderSidebar());
    document.getElementById('sortBy').addEventListener('change', () => renderSidebar());
}

// ======================= INITIALIZATION =======================
window.onload = () => {
    checkProtocol();
    initMap();
    renderSidebar();
    addExtraButtons();
    initSidebarToggle();
    initEventListeners();
    warnBeforeUnload();
    
    window.addEventListener('beforeunload', () => {
        if (watchId !== null) {
            navigator.geolocation.clearWatch(watchId);
        }
    });
};
