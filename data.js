// ======================= DATA TPS (GeoJSON Style) =========================
// TPA Jatibarang sebagai titik tujuan
const TPA = {
    lat: -7.021531,
    lng: 110.358348,
    name: "TPA Jatibarang"
};

// KEY untuk localStorage
const STORAGE_KEY = "wasteRoute_tpsData";
const NEXT_ID_KEY = "wasteRoute_nextId";

// Data TPS default
const defaultTpsData = [
    { id: 1, name: "TPS Panggung Lor", lat: -6.954282, lng: 110.401332, address: "Panggung Lor, Kec. Semarang Utara" },
    { id: 2, name: "TPS Pedurungan", lat: -7.022204, lng: 110.478043, address: "Pedurungan Kidul, Kec. Pedurungan" },
    { id: 3, name: "TPS Sambirejo", lat: -6.983480, lng: 110.441832, address: "Gayamsari, Kec. Gayamsari" },
    { id: 4, name: "TPS Barito", lat: -6.984681, lng: 110.440261, address: "Jl. Barito, Kec. Semarang Timur" },
    { id: 5, name: "TPS Genuksari", lat: -6.966429, lng: 110.477638, address: "Genuk, Kec. Genuk" },
    { id: 6, name: "TPS Rasamala", lat: -7.069977, lng: 110.416965, address: "Srondol, Kec. Banyumanik" },
    { id: 7, name: "TPS Ngesrep", lat: -7.034298, lng: 110.418125, address: "Kel. Ngesrep, Kec. Banyumanik" },
    { id: 8, name: "TPS Magersari", lat: -7.085172, lng: 110.360115, address: "Gunung Pati, Kec. Gunung Pati" },
    { id: 9, name: "TPS Miroto", lat: -6.982051, lng: 110.417308, address: "Sekayu, Kec. Semarang Tengah" },
    { id: 10, name: "TPS Sawah Besar", lat: -6.964032, lng: 110.4498879, address: "Kaligawe, Kec. Gayamsari" },
    { id: 11, name: "TPS Tembalang", lat: -7.059352, lng: 110.447703, address: "Bulusan, Kec. Tembalang" },
    { id: 12, name: "TPS Salamanmloyo", lat: -6.986212, lng: 110.393067, address: "Manyaran, Kec. Semarang Barat" },
    { id: 13, name: "TPS Pasar Bandarjo", lat: -7.123954, lng: 110.407786, address: "Bandarjo, Kec. Ungaran" },
    { id: 14, name: "TPS Kasipah", lat: -7.020354, lng: 110.426080, address: "Jatingaleh, Kec. Candisari" },
    { id: 15, name: "TPS Lamper Kidul", lat: -7.0419, lng: 110.4512, address: "Lamper, Kec. Semarang Selatan" }
];

// Variabel global untuk data
let tpsData = [];
let nextId = 16;

// Fungsi untuk memuat data dari localStorage
function loadDataFromStorage() {
    const savedData = localStorage.getItem(STORAGE_KEY);
    const savedNextId = localStorage.getItem(NEXT_ID_KEY);
    
    if (savedData) {
        tpsData = JSON.parse(savedData);
        nextId = savedNextId ? parseInt(savedNextId) : Math.max(...tpsData.map(t => t.id), 0) + 1;
    } else {
        tpsData = [...defaultTpsData];
        nextId = 16;
        saveDataToStorage(false);
    }
    
    window.tpsData = tpsData;
    window.nextId = nextId;
}

// Fungsi untuk menyimpan data ke localStorage (dengan validasi password)
function saveDataToStorage(requirePassword = true) {
    return new Promise((resolve, reject) => {
        const doSave = () => {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(tpsData));
            localStorage.setItem(NEXT_ID_KEY, nextId.toString());
            window.tpsData = tpsData;
            window.nextId = nextId;
            resolve(true);
        };
        
        if (!requirePassword) {
            doSave();
            return;
        }
        
        Swal.fire({
            title: '🔒 Simpan Data Permanen',
            html: `
                <div style="text-align: center;">
                    <i class="fas fa-shield-alt" style="font-size: 48px; color: #f59e0b; margin-bottom: 15px;"></i>
                    <p style="margin-bottom: 10px;">Masukkan password untuk menyimpan perubahan data TPS</p>
                    <input type="password" id="savePassword" class="swal2-input" placeholder="Password" style="text-align: center;">
                </div>
            `,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: '<i class="fas fa-save"></i> Simpan',
            cancelButtonText: 'Batal',
            preConfirm: () => {
                const password = document.getElementById('savePassword').value;
                if (password === "ayam jago") {
                    return true;
                } else {
                    Swal.showValidationMessage('❌ Password salah! Data TIDAK tersimpan.');
                    return false;
                }
            }
        }).then((result) => {
            if (result.isConfirmed) {
                doSave();
                Swal.fire({
                    title: '✅ Berhasil!',
                    text: 'Data TPS telah disimpan secara permanen',
                    icon: 'success',
                    timer: 2000,
                    showConfirmButton: false
                });
            } else {
                reject(false);
                Swal.fire({
                    title: '⚠️ Penyimpanan Dibatalkan',
                    text: 'Perubahan data TPS TIDAK tersimpan secara permanen',
                    icon: 'warning',
                    timer: 2000,
                    showConfirmButton: false
                });
            }
        });
    });
}

// Fungsi untuk reset ke data default
function resetToDefaultData() {
    Swal.fire({
        title: '⚠️ Reset Data',
        text: 'Apakah Anda yakin ingin mereset semua data TPS ke default?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#e74c3c',
        confirmButtonText: '<i class="fas fa-trash"></i> Ya, Reset!',
        cancelButtonText: 'Batal'
    }).then((result) => {
        if (result.isConfirmed) {
            Swal.fire({
                title: '🔒 Konfirmasi Reset',
                html: '<input type="password" id="resetPassword" class="swal2-input" placeholder="Masukkan password">',
                preConfirm: () => {
                    const password = document.getElementById('resetPassword').value;
                    if (password === "ayam jago") {
                        return true;
                    } else {
                        Swal.showValidationMessage('Password salah!');
                        return false;
                    }
                }
            }).then((res) => {
                if (res.isConfirmed) {
                    tpsData = [...defaultTpsData];
                    nextId = 16;
                    saveDataToStorage(false);
                    // Trigger refresh jika ada fungsi dari app.js
                    if (typeof window.refreshAfterReset === 'function') {
                        window.refreshAfterReset();
                    }
                    Swal.fire('Berhasil!', 'Data telah direset ke default', 'success');
                }
            });
        }
    });
}

// Fungsi untuk mengkonversi ke format GeoJSON
function convertToGeoJSON() {
    const features = tpsData.map(tps => ({
        type: "Feature",
        geometry: {
            type: "Point",
            coordinates: [tps.lng, tps.lat]
        },
        properties: {
            id: tps.id,
            name: tps.name,
            address: tps.address
        }
    }));
    
    return {
        type: "FeatureCollection",
        name: "tps_semarang",
        features: features
    };
}

// Load data saat script dijalankan
loadDataFromStorage();

// Ekspor ke global window
window.TPA = TPA;
window.tpsData = tpsData;
window.nextId = nextId;
window.STORAGE_KEY = STORAGE_KEY;
window.NEXT_ID_KEY = NEXT_ID_KEY;
window.defaultTpsData = defaultTpsData;
window.saveDataToStorage = saveDataToStorage;
window.resetToDefaultData = resetToDefaultData;
window.convertToGeoJSON = convertToGeoJSON;
window.loadDataFromStorage = loadDataFromStorage;
