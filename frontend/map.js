// Check if user is logged in
const token = localStorage.getItem('token');
const user = JSON.parse(localStorage.getItem('user') || '{}');

if (!token) {
    // Not logged in, redirect to login page
    window.location.href = 'index.html';
}

// Display username
document.getElementById('username').textContent = `Welcome, ${user.username || 'User'}!`;

// Logout functionality
document.getElementById('logoutBtn').addEventListener('click', () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = 'index.html';
});

// Initialize map when ArcGIS loads
require([
    "esri/Map",
    "esri/views/MapView",
    "esri/layers/GraphicsLayer",
    "esri/Graphic",
    "esri/widgets/Locate",
    "esri/widgets/BasemapGallery",
    "esri/widgets/Expand"
], function(Map, MapView, GraphicsLayer, Graphic, Locate, BasemapGallery, Expand) {
    
    // Create graphics layer for incidents
    const incidentsLayer = new GraphicsLayer({
        id: "incidents"
    });
    
    // Create map
    const map = new Map({
        basemap: "streets-navigation-vector",
        layers: [incidentsLayer]
    });
    
    // Create map view (centered on Bucharest)
    const view = new MapView({
        container: "mapDiv",
        map: map,
        center: [26.1025, 44.4268], // Bucharest, Romania [longitude, latitude]
        zoom: 12
    });
    
    // Add locate button (find my location)
    const locateWidget = new Locate({
        view: view,
        useHeadingEnabled: false,
        goToOverride: function(view, options) {
            options.target.scale = 1500;
            return view.goTo(options.target);
        }
    });
    view.ui.add(locateWidget, "top-left");
    
    // Add basemap gallery
    const basemapGallery = new BasemapGallery({
        view: view
    });
    const bgExpand = new Expand({
        view: view,
        content: basemapGallery,
        expandIcon: "basemap"
    });
    view.ui.add(bgExpand, "top-right");
    
    // Hide loading indicator when map loads
    view.when(() => {
        document.getElementById('loading').classList.add('hidden');
        console.log("Map loaded successfully");
        
        // Load incidents from backend
        loadIncidents();
    }).catch((error) => {
        console.error("Error loading map:", error);
        document.getElementById('loading').innerHTML = 
            '<p style="color: red;">Error loading map. Please refresh.</p>';
    });
    
    // Function to load incidents from backend
    async function loadIncidents() {
        try {
            const response = await fetch('http://localhost:5000/api/reports', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (!response.ok) {
                console.log('No incidents loaded yet');
                return;
            }
            
            const data = await response.json();
            console.log(`Loaded ${data.reports?.length || 0} incidents`);
            
            // Add incidents to map (we'll implement this later)
            if (data.reports && data.reports.length > 0) {
                data.reports.forEach(incident => {
                    addIncidentToMap(incident);
                });
            }
        } catch (error) {
            console.error('Error loading incidents:', error);
        }
    }
    
    // Function to add incident marker to map
    function addIncidentToMap(incident) {
        const point = {
            type: "point",
            longitude: incident.longitude,
            latitude: incident.latitude
        };
        
        const markerSymbol = {
            type: "simple-marker",
            color: [226, 119, 40], // Orange
            size: "12px",
            outline: {
                color: [255, 255, 255],
                width: 2
            }
        };
        
        const graphic = new Graphic({
            geometry: point,
            symbol: markerSymbol,
            attributes: incident,
            popupTemplate: {
                title: incident.type_name || "Incident",
                content: incident.description || "No description"
            }
        });
        
        incidentsLayer.add(graphic);
    }
    
    // Click on map to add new incident (we'll implement this later)
    view.on("click", function(event) {
        console.log("Clicked at:", event.mapPoint.longitude, event.mapPoint.latitude);
        // TODO: Add incident reporting functionality
    });
});

