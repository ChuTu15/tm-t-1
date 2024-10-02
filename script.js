$(document).ready(function () {
    var mapObj = null;
    var defaultCoord = [21.0819, 105.6363];
    var zoomLevel = 8;
    var mapConfig = {
        attributionControl: false,
        center: defaultCoord,
        zoom: zoomLevel,
    };

    mapObj = L.map('map', mapConfig);

    L.tileLayer('http://localhost:8080/styles/basic-preview/512/{z}/{x}/{y}.png', {
        maxZoom: 18,
        attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(mapObj);

    var searchMarker, userMarker;
    var routingControl;

    // Autocomplete logic
    $("#searchBox").autocomplete({
        source: function (request, response) {
            var url = 'https://nominatim.openstreetmap.org/search?format=json&q=' + request.term;
            fetch(url)
                .then(res => res.json())
                .then(data => {
                    if (data && data.length > 0) {
                        var results = data.map(item => ({
                            label: item.display_name,
                            lat: item.lat,
                            lon: item.lon
                        }));
                        response(results);
                    } else {
                        response([]);
                    }
                })
                .catch(err => {
                    console.error("Error fetching data from Nominatim:", err);
                    response([]);
                });
        },
        minLength: 0,
        select: function (event, ui) {
            $("#searchBox").val(ui.item.label);
            var latlng = [ui.item.lat, ui.item.lon];
            mapObj.flyTo(latlng, 15);

            // Clear old marker
            if (searchMarker) {
                mapObj.removeLayer(searchMarker);
            }

            // Add new marker
            searchMarker = L.marker(latlng).addTo(mapObj)
                .bindPopup(ui.item.label)
                .openPopup();
        }
    });

    // GPS button click event
    $('#gpsButton').click(function () {
        if (navigator.geolocation) {
            var geoOptions = {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0
            };

            navigator.geolocation.getCurrentPosition(function (position) {
                var lat = position.coords.latitude;
                var lng = position.coords.longitude;

                var userLocation = [lat, lng];
                mapObj.flyTo(userLocation, 15);

                if (userMarker) {
                    userMarker.setLatLng(userLocation).update();
                } else {
                    userMarker = L.marker(userLocation).addTo(mapObj)
                        .bindPopup("You are here!")
                        .openPopup();
                }
            }, function (error) {
                console.error("Error Code = " + error.code + " - " + error.message);
            }, geoOptions);
        } else {
            alert("Geolocation is not supported by this browser.");
        }
    });

    function onMapClick(e) {
        var latlng = e.latlng;
        var lat = latlng.lat;
        var lng = latlng.lng;

        // Reverse geocoding
        fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`)
            .then(response => response.json())
            .then(data => {
                var address = data.display_name || "Không tìm thấy địa chỉ";
                L.popup()
                    .setLatLng(latlng)
                    .setContent(address)
                    .openOn(mapObj);
            })
            .catch(error => {
                console.error('Error:', error);
                L.popup()
                    .setLatLng(latlng)
                    .setContent(lat + ", " + lng)
                    .openOn(mapObj);
            });
    }
    
    mapObj.on('click', onMapClick);

    // Routing functionality
    var startMarker, endMarker;

    function route(start, end) {
        if (routingControl) {
            mapObj.removeControl(routingControl);
        }
        routingControl = L.Routing.control({
            waypoints: [
                L.latLng(start[0], start[1]),
                L.latLng(end[0], end[1])
            ],
            routeWhileDragging: true,
            geocoder: L.Control.Geocoder.nominatim()
        }).addTo(mapObj);
    }

    // Event to get the route from the user location to the clicked location
    mapObj.on('click', function(e) {
        if (userMarker) {
            var userLocation = userMarker.getLatLng();
            var destination = [e.latlng.lat, e.latlng.lng];

            if (startMarker) {
                mapObj.removeLayer(startMarker);
            }
            startMarker = L.marker(userLocation).addTo(mapObj);
            route(userLocation, destination);
        }
    });
});
