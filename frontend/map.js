// Check if user is logged in
const token = localStorage.getItem('token');
const user = JSON.parse(localStorage.getItem('user') || '{}');

if (!token) {
    // Not logged in, redirect to login page
    window.location.href = 'index.html';
}

// Display username
document.getElementById('username').textContent = `Welcome, ${user.username || 'User'}!`;

// Profile button functionality
document.getElementById('profileBtn').addEventListener('click', () => {
    window.location.href = 'profile.html';
});

// Logout functionality
document.getElementById('logoutBtn').addEventListener('click', () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = 'index.html';
});

// Store current location globally
let currentLocation = null;

// Initialize map when ArcGIS loads
require([
    "esri/config",
    "esri/Map",
    "esri/views/MapView",
    "esri/layers/GraphicsLayer",
    "esri/Graphic",
    "esri/widgets/Locate",
    "esri/widgets/BasemapGallery",
    "esri/widgets/Expand",
    "esri/widgets/Search",
    "esri/rest/route",
    "esri/rest/support/RouteParameters",
    "esri/rest/support/FeatureSet",
    "esri/rest/locator",
    "esri/geometry/Point",
    "esri/symbols/SimpleMarkerSymbol",
    "esri/symbols/SimpleLineSymbol"
], function(esriConfig, Map, MapView, GraphicsLayer, Graphic, Locate, BasemapGallery, Expand, Search, route, RouteParameters, FeatureSet, locator, Point, SimpleMarkerSymbol, SimpleLineSymbol) {
    
    // ArcGIS API Key - Set your key here for routing functionality
    // Get your free key at: https://developers.arcgis.com/
    // IMPORTANT: Enable "Routing" and "Geocoding" services for your key
    const ARCGIS_API_KEY = "AAPTxy8BH1VEsoebNVZXo8HurJdkwEBjFLSiQ98a9TIC3ugF3TD_ypArrlJiI1rb4W--uwDNeVmcJq6uuIT2tvfNSlzdZvcLzG_qhjeiGV4cKM2iZt3Xn96H64C1huqnUWk2Ye9xTrwWYFkzz67B9zehUsw1Wf73vm4T8DOLq3XKEjmhPtmgychGZf5tpty6En6p_LWVbDQ--PQCg6hguz_9lMSzqGF9kWGI16f23TKjDRo.AT1_FQU1XK45"; // <-- PUT YOUR API KEY HERE
    
    // Only set the API key if one is provided (map will work without it, but routing won't)
    if (ARCGIS_API_KEY && ARCGIS_API_KEY.length > 10) {
        esriConfig.apiKey = ARCGIS_API_KEY;
    }
    
    // Route service URL
    const routeUrl = "https://route-api.arcgis.com/arcgis/rest/services/World/Route/NAServer/Route_World";
    
    // Geocoding service URL  
    const geocodeUrl = "https://geocode-api.arcgis.com/arcgis/rest/services/World/GeocodeServer";
    
    // Create graphics layer for incidents
    const incidentsLayer = new GraphicsLayer({
        id: "incidents"
    });
    
    // Create graphics layer for route
    const routeLayer = new GraphicsLayer({
        id: "route"
    });
    
    // Create graphics layer for route stops
    const stopsLayer = new GraphicsLayer({
        id: "stops"
    });
    
    // Create map
    const map = new Map({
        basemap: "streets-navigation-vector",
        layers: [routeLayer, stopsLayer, incidentsLayer]
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
    
    // Update current location when locate is triggered
    locateWidget.on("locate", function(event) {
        currentLocation = {
            longitude: event.position.coords.longitude,
            latitude: event.position.coords.latitude
        };
        console.log("Location updated:", currentLocation);
    });
    
    // Add Search widget
    const searchWidget = new Search({
        view: view,
        popupEnabled: true,
        resultGraphicEnabled: true,
        searchAllEnabled: true,
        includeDefaultSources: true,
        locationEnabled: true,
        suggestionsEnabled: true,
        maxSuggestions: 6,
        minSuggestCharacters: 2
    });
    view.ui.add(searchWidget, {
        position: "top-right",
        index: 0
    });
    
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
    
    // ==========================================
    // RECENTER BUTTON FUNCTIONALITY
    // ==========================================
    const recenterBtn = document.getElementById('recenterBtn');
    
    recenterBtn.addEventListener('click', async () => {
        if (currentLocation) {
            // Use stored location
            view.goTo({
                center: [currentLocation.longitude, currentLocation.latitude],
                zoom: 15
            }, { duration: 1000 });
        } else {
            // Get new location
            if (navigator.geolocation) {
                recenterBtn.style.opacity = '0.5';
                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        currentLocation = {
                            longitude: position.coords.longitude,
                            latitude: position.coords.latitude
                        };
                        view.goTo({
                            center: [currentLocation.longitude, currentLocation.latitude],
                            zoom: 15
                        }, { duration: 1000 });
                        recenterBtn.style.opacity = '1';
                    },
                    (error) => {
                        console.error("Error getting location:", error);
                        alert("Could not get your location. Please enable location services.");
                        recenterBtn.style.opacity = '1';
                    },
                    { enableHighAccuracy: true }
                );
            } else {
                alert("Geolocation is not supported by your browser.");
            }
        }
    });
    
    // ==========================================
    // DIRECTIONS PANEL FUNCTIONALITY
    // ==========================================
    const directionsPanel = document.getElementById('directionsPanel');
    const toggleDirectionsBtn = document.getElementById('toggleDirectionsBtn');
    const closeDirectionsBtn = document.getElementById('closeDirections');
    const startInput = document.getElementById('startInput');
    const endInput = document.getElementById('endInput');
    const useCurrentLocationBtn = document.getElementById('useCurrentLocation');
    const getDirectionsBtn = document.getElementById('getDirectionsBtn');
    const clearRouteBtn = document.getElementById('clearRouteBtn');
    const directionsResults = document.getElementById('directionsResults');
    
    // Toggle directions panel
    toggleDirectionsBtn.addEventListener('click', () => {
        directionsPanel.classList.toggle('active');
    });
    
    closeDirectionsBtn.addEventListener('click', () => {
        directionsPanel.classList.remove('active');
    });
    
    // Use current location for start
    useCurrentLocationBtn.addEventListener('click', async () => {
        if (currentLocation) {
            startInput.value = "My Location";
            startInput.dataset.coords = JSON.stringify(currentLocation);
        } else {
            if (navigator.geolocation) {
                useCurrentLocationBtn.textContent = '⏳';
                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        currentLocation = {
                            longitude: position.coords.longitude,
                            latitude: position.coords.latitude
                        };
                        startInput.value = "My Location";
                        startInput.dataset.coords = JSON.stringify(currentLocation);
                        useCurrentLocationBtn.textContent = '📍';
                    },
                    (error) => {
                        console.error("Error getting location:", error);
                        alert("Could not get your location.");
                        useCurrentLocationBtn.textContent = '📍';
                    },
                    { enableHighAccuracy: true }
                );
            }
        }
    });
    
    // ==========================================
    // AUTOCOMPLETE SUGGESTIONS
    // ==========================================
    let suggestionTimeout = null;
    let activeSuggestionList = null;
    
    // Create suggestions container for an input
    function createSuggestionsContainer(inputElement) {
        const container = document.createElement('div');
        container.className = 'suggestions-container';
        inputElement.parentNode.appendChild(container);
        return container;
    }
    
    const startSuggestions = createSuggestionsContainer(startInput);
    const endSuggestions = createSuggestionsContainer(endInput);
    
    // Fetch suggestions for a search term
    async function fetchSuggestions(searchText) {
        if (!searchText || searchText.length < 2) return [];
        
        try {
            const response = await locator.suggestLocations(geocodeUrl, {
                text: searchText,
                location: view.center,
                maxSuggestions: 6
            });
            return response || [];
        } catch (error) {
            console.error("Suggestion error:", error);
            return [];
        }
    }
    
    // Display suggestions in a container
    function displaySuggestions(suggestions, container, inputElement) {
        container.innerHTML = '';
        
        if (suggestions.length === 0) {
            container.style.display = 'none';
            return;
        }
        
        suggestions.forEach(suggestion => {
            const item = document.createElement('div');
            item.className = 'suggestion-item';
            item.textContent = suggestion.text;
            item.addEventListener('click', async () => {
                inputElement.value = suggestion.text;
                container.style.display = 'none';
                
                // Get the actual coordinates for this suggestion
                const result = await locator.addressToLocations(geocodeUrl, {
                    address: { SingleLine: suggestion.text },
                    magicKey: suggestion.magicKey,
                    maxLocations: 1,
                    outFields: ["*"]
                });
                
                if (result && result.length > 0) {
                    inputElement.dataset.coords = JSON.stringify({
                        longitude: result[0].location.longitude,
                        latitude: result[0].location.latitude
                    });
                }
            });
            container.appendChild(item);
        });
        
        container.style.display = 'block';
    }
    
    // Handle input events for autocomplete
    function setupAutocomplete(inputElement, suggestionsContainer) {
        inputElement.addEventListener('input', () => {
            // Clear stored coordinates when user types
            delete inputElement.dataset.coords;
            
            // Debounce the suggestion request
            if (suggestionTimeout) clearTimeout(suggestionTimeout);
            
            suggestionTimeout = setTimeout(async () => {
                const suggestions = await fetchSuggestions(inputElement.value);
                displaySuggestions(suggestions, suggestionsContainer, inputElement);
            }, 300);
        });
        
        inputElement.addEventListener('focus', async () => {
            if (inputElement.value.length >= 2) {
                const suggestions = await fetchSuggestions(inputElement.value);
                displaySuggestions(suggestions, suggestionsContainer, inputElement);
            }
        });
        
        inputElement.addEventListener('blur', () => {
            // Delay hiding to allow click on suggestion
            setTimeout(() => {
                suggestionsContainer.style.display = 'none';
            }, 200);
        });
    }
    
    setupAutocomplete(startInput, startSuggestions);
    setupAutocomplete(endInput, endSuggestions);
    
    // Geocode an address to coordinates
    async function geocodeAddress(address) {
        try {
            // Get current map extent to bias search results
            const extent = view.extent;
            const center = view.center;
            
            const results = await locator.addressToLocations(geocodeUrl, {
                address: { SingleLine: address },
                location: center,
                maxLocations: 5,
                outFields: ["Addr_type", "Match_addr", "StAddr", "City", "Country"],
                countryCode: "RO", // Bias towards Romania
                searchExtent: extent
            });
            
            console.log("Geocode results for:", address, results);
            
            if (results && results.length > 0) {
                // Find the best match (prefer PointAddress or StreetAddress types)
                let bestResult = results[0];
                for (const result of results) {
                    if (result.attributes.Addr_type === "PointAddress" || 
                        result.attributes.Addr_type === "StreetAddress") {
                        bestResult = result;
                        break;
                    }
                }
                
                return {
                    longitude: bestResult.location.longitude,
                    latitude: bestResult.location.latitude,
                    address: bestResult.address
                };
            }
            
            // If no results with extent, try without location bias
            const globalResults = await locator.addressToLocations(geocodeUrl, {
                address: { SingleLine: address },
                maxLocations: 1,
                outFields: ["*"]
            });
            
            if (globalResults && globalResults.length > 0) {
                return {
                    longitude: globalResults[0].location.longitude,
                    latitude: globalResults[0].location.latitude,
                    address: globalResults[0].address
                };
            }
            
            return null;
        } catch (error) {
            console.error("Geocoding error:", error);
            return null;
        }
    }
    
    // Parse input that could be coordinates or address
    async function parseLocationInput(input, inputElement) {
        // Check if there are stored coordinates
        if (inputElement.dataset.coords) {
            try {
                return JSON.parse(inputElement.dataset.coords);
            } catch (e) {
                // Continue to other parsing methods
            }
        }
        
        // Check if input is coordinates (lat, lng format)
        const coordRegex = /^(-?\d+\.?\d*),\s*(-?\d+\.?\d*)$/;
        const match = input.trim().match(coordRegex);
        if (match) {
            return {
                latitude: parseFloat(match[1]),
                longitude: parseFloat(match[2])
            };
        }
        
        // Otherwise, geocode the address
        return await geocodeAddress(input);
    }
    
    // Get directions
    getDirectionsBtn.addEventListener('click', async () => {
        const startValue = startInput.value.trim();
        const endValue = endInput.value.trim();
        
        if (!startValue || !endValue) {
            alert("Please enter both start and destination locations.");
            return;
        }
        
        getDirectionsBtn.disabled = true;
        getDirectionsBtn.textContent = 'Calculating...';
        directionsResults.innerHTML = '<div style="padding: 15px; text-align: center; color: #666;"><div class="spinner" style="width: 30px; height: 30px; margin: 0 auto 10px;"></div>Finding best route...</div>';
        
        try {
            // Parse start location
            const startLocation = await parseLocationInput(startValue, startInput);
            if (!startLocation) {
                throw new Error("Could not find start location. Please try a different address.");
            }
            
            // Parse end location
            const endLocation = await parseLocationInput(endValue, endInput);
            if (!endLocation) {
                throw new Error("Could not find destination. Please try a different address.");
            }
            
            // Calculate route
            await calculateRoute(startLocation, endLocation);
            
        } catch (error) {
            console.error("Directions error:", error);
            directionsResults.innerHTML = `<div style="padding: 15px; color: #e74c3c; text-align: center;">❌ ${error.message}</div>`;
        } finally {
            getDirectionsBtn.disabled = false;
            getDirectionsBtn.textContent = 'Get Route';
        }
    });
    
    // Calculate route between two points (following ArcGIS tutorial approach)
    // Reference: https://developers.arcgis.com/javascript/latest/tutorials/find-a-route-and-directions/
    async function calculateRoute(start, end) {
        // Clear previous route
        routeLayer.removeAll();
        stopsLayer.removeAll();
        
        // Create start point graphic (following tutorial pattern)
        const startPoint = new Point({
            longitude: start.longitude,
            latitude: start.latitude
        });
        
        const endPoint = new Point({
            longitude: end.longitude,
            latitude: end.latitude
        });
        
        // Create start marker symbol
        const startSymbol = new SimpleMarkerSymbol({
            color: [39, 174, 96], // Green
            size: 16,
            outline: {
                color: [255, 255, 255],
                width: 2
            }
        });
        
        // Create end marker symbol  
        const endSymbol = new SimpleMarkerSymbol({
            color: [231, 76, 60], // Red
            size: 16,
            outline: {
                color: [255, 255, 255],
                width: 2
            }
        });
        
        // Add start marker graphic
        const startGraphic = new Graphic({
            geometry: startPoint,
            symbol: startSymbol,
            attributes: { 
                type: "start",
                name: start.address || "Start"
            }
        });
        stopsLayer.add(startGraphic);
        
        // Add end marker graphic
        const endGraphic = new Graphic({
            geometry: endPoint,
            symbol: endSymbol,
            attributes: { 
                type: "end",
                name: end.address || "Destination"
            }
        });
        stopsLayer.add(endGraphic);
        
        // Set up route parameters using FeatureSet (as per ArcGIS tutorial)
        const routeParams = new RouteParameters({
            stops: new FeatureSet({
                features: [startGraphic, endGraphic]
            }),
            returnDirections: true,
            directionsLanguage: "en",
            directionsLengthUnits: "kilometers"
        });
        
        try {
            // Solve route using the route service
            const result = await route.solve(routeUrl, routeParams);
            
            if (result.routeResults && result.routeResults.length > 0) {
                const routeResult = result.routeResults[0];
                
                // Create route line symbol (following tutorial pattern)
                const routeSymbol = new SimpleLineSymbol({
                    color: [102, 126, 234],
                    width: 4
                });
                
                // Add route line to map
                routeResult.route.symbol = routeSymbol;
                routeLayer.add(routeResult.route);
                
                // Zoom to route extent
                view.goTo(routeResult.route.geometry.extent.expand(1.3), {
                    duration: 1000
                });
                
                // Display turn-by-turn directions
                displayDirections(routeResult);
            } else {
                throw new Error("No route found between these locations.");
            }
        } catch (error) {
            console.error("Route calculation error:", error);
            throw new Error("Could not calculate route. Please try different locations.");
        }
    }
    
    // Display turn-by-turn directions
    function displayDirections(routeResult) {
        const route = routeResult.route;
        const directions = routeResult.directions;
        
        // Calculate total distance and time
        const totalLength = route.attributes.Total_Kilometers || route.attributes.Total_Length || 0;
        const totalTime = route.attributes.Total_TravelTime || route.attributes.Total_Time || 0;
        
        let html = `
            <div class="route-summary">
                <div class="route-info">
                    <div class="route-info-item">
                        <span class="icon">📏</span>
                        <div>
                            <span class="value">${totalLength.toFixed(1)} km</span>
                            <span class="label">Distance</span>
                        </div>
                    </div>
                    <div class="route-info-item">
                        <span class="icon">⏱️</span>
                        <div>
                            <span class="value">${formatTime(totalTime)}</span>
                            <span class="label">Duration</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Add step-by-step directions if available
        if (directions && directions.features && directions.features.length > 0) {
            html += '<ul class="route-steps">';
            
            directions.features.forEach((feature, index) => {
                const step = feature.attributes;
                const icon = getDirectionIcon(step.maneuverType);
                const distance = step.length ? `${step.length.toFixed(2)} km` : '';
                
                html += `
                    <li class="route-step">
                        <span class="step-icon">${icon}</span>
                        <div>
                            <div class="step-text">${step.text}</div>
                            ${distance ? `<div class="step-distance">${distance}</div>` : ''}
                        </div>
                    </li>
                `;
            });
            
            html += '</ul>';
        }
        
        directionsResults.innerHTML = html;
    }
    
    // Format time in minutes to hours and minutes
    function formatTime(minutes) {
        if (minutes < 60) {
            return `${Math.round(minutes)} min`;
        }
        const hours = Math.floor(minutes / 60);
        const mins = Math.round(minutes % 60);
        return `${hours}h ${mins}min`;
    }
    
    // Get icon for direction maneuver
    function getDirectionIcon(maneuverType) {
        const icons = {
            'esriDMTDepart': '🚗',
            'esriDMTStraight': '⬆️',
            'esriDMTBearLeft': '↖️',
            'esriDMTBearRight': '↗️',
            'esriDMTTurnLeft': '⬅️',
            'esriDMTTurnRight': '➡️',
            'esriDMTSharpLeft': '↩️',
            'esriDMTSharpRight': '↪️',
            'esriDMTUTurn': '🔄',
            'esriDMTRoundabout': '🔄',
            'esriDMTStop': '🏁',
            'esriDMTFerry': '⛴️',
            'esriDMTEndOfFerry': '🚗',
            'esriDMTHighway': '🛣️',
            'esriDMTRamp': '📐'
        };
        return icons[maneuverType] || '📍';
    }
    
    // Clear route
    clearRouteBtn.addEventListener('click', () => {
        routeLayer.removeAll();
        stopsLayer.removeAll();
        directionsResults.innerHTML = '';
        startInput.value = '';
        endInput.value = '';
        delete startInput.dataset.coords;
        delete endInput.dataset.coords;
    });
    
    // Hide loading indicator when map loads
    view.when(() => {
        document.getElementById('loading').classList.add('hidden');
        console.log("Map loaded successfully");
        
        // Load incidents from backend
        loadIncidents();
        
        // Try to get initial location
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    currentLocation = {
                        longitude: position.coords.longitude,
                        latitude: position.coords.latitude
                    };
                    console.log("Initial location obtained:", currentLocation);
                },
                (error) => {
                    console.log("Could not get initial location:", error.message);
                }
            );
        }
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
            
            // Add incidents to map
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
