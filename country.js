const input = document.querySelector(".searchInput");
const button = document.querySelector(".searchButton");
const card = document.querySelector(".countryCard");
const form = document.querySelector(".searchForm");
const datalist = document.querySelector("#countriesList");
const container = document.querySelector(".container");
const locationButton = document.querySelector(".locationButton");
const infos = document.querySelector(".infos");
const watermark = document.querySelector(".footer");


let allCountries = [];
let timeInterval;
let naturalEarthData = null;
let naturalEarthByISO = new Map();
let currentSearchId = 0;

// RESPONSIVE BREAKPOINTS

const smallPhone = window.matchMedia("(max-width: 382px)");
const NormalPhone = window.matchMedia("(min-width: 384px) and (max-width: 601px)");
const tablet = window.matchMedia("(min-width: 601px) and (max-width: 1024px)");
const desktop = window.matchMedia("(min-width: 1025px)");

// THREE.JS + GLTF LOADER

import * as THREE from "https://esm.sh/three";
import {GLTFLoader} from "https://esm.sh/three/examples/jsm/loaders/GLTFLoader.js";

const gltfLoader = new GLTFLoader();

// CREATE GLOBE

const world = new Globe(

    document.getElementById("globeViz"),
    {
        animateIn: false,
        rendererConfig: {
            alpha: true,
            antialias: true
        }
    }
)
    .globeImageUrl(
        "//cdn.jsdelivr.net/npm/three-globe/example/img/earth-blue-marble.jpg"
    )
    .bumpImageUrl(
        "//cdn.jsdelivr.net/npm/three-globe/example/img/earth-topology.png"
    )
    .backgroundColor("rgba(0, 0, 0, 0)");


// Make globe background completely transparent
world.renderer().setClearColor(0x000000, 0);

// Globe rotation
world.controls().autoRotate = true;
world.controls().autoRotateSpeed = getScreenAltitudeAndSpeed().rotateSpeed;

// GLOBE ALTITUDE

function getScreenAltitudeAndSpeed() {

    if (smallPhone.matches) {
        return {
            initial: 3.5,
            search: 2.7,
            rotateSpeed: 0.9
        };
    }

    if (NormalPhone.matches) {
        return {
            initial: 3.6,
            search: 2.8,
            rotateSpeed : 0.9
        };
    }

    if (tablet.matches) {
        return {
            initial: 2.5,
            search: 1.8,
            rotateSpeed : 0.3
        };
    }

    return {
        initial: 1.6,
        search: 1.5,
        rotateSpeed : 0.3
    };
}

world.pointOfView({
    altitude: getScreenAltitudeAndSpeed().initial
});


// CLOUDS — PROMISE

const CLOUDS_IMG_URL = "./clouds.png";
const CLOUDS_ALT = 0.004;
const CLOUDS_ROTATION_SPEED = -0.006;

// ASTRONAUT SCENE

const astronautContainer = document.getElementById("astronautViz");
const astronautScene = new THREE.Scene();

const astronautCamera =
    new THREE.PerspectiveCamera(
        50,
        astronautContainer.clientWidth /
        astronautContainer.clientHeight,
        0.1,
        100
    );

astronautCamera.position.set(0,0,5);

const astronautRenderer =

    new THREE.WebGLRenderer({
        alpha: true,
        antialias: true
    });

astronautRenderer.setSize(
    astronautContainer.clientWidth,
    astronautContainer.clientHeight
);

astronautRenderer.setClearColor(0x000000,0);
astronautContainer.appendChild(astronautRenderer.domElement);

// ASTRONAUT LIGHTING

astronautScene.add(
    new THREE.AmbientLight(
        0xffffff,
        1
    )
);

const astronautLight =
    new THREE.DirectionalLight(
        0xffffff,
        1.5
    );

astronautLight.position.set(2,3,4);
astronautScene.add(astronautLight);

// ASTRONAUT VARIABLES

let astronautModel = null;
let astronautMixer = null;
const astronautClock = new THREE.Clock();

// ASTRONAUT ANIMATION

let isDraggingAstronaut = false;
let previousPointerX = 0;
let previousPointerY = 0;

// Manual rotation

let dragRotationY = 0;
let dragRotationX = 0;

function animateAstronautScene() {

    requestAnimationFrame(
        animateAstronautScene
    );

    const delta = astronautClock.getDelta();

    if (astronautMixer) {
        astronautMixer.update(
            delta
        );
    }

    if (astronautModel) {

        // Floating animation

        astronautModel.position.y =
            Math.sin(astronautClock.elapsedTime * 1.2) * 0.15;

        if (isDraggingAstronaut) {
            // Follow pointer

            astronautModel.rotation.y = dragRotationY;
            astronautModel.rotation.x = dragRotationX;

        }

        else {
            // Slow automatic rotation
            dragRotationY += 0.003;
            astronautModel.rotation.y = dragRotationY;
        }
    }

    astronautRenderer.render(
        astronautScene,
        astronautCamera
    );
}

animateAstronautScene();

// ASTRONAUT DRAG

astronautRenderer.domElement.addEventListener(
    "pointerdown",
    (event) => {

        isDraggingAstronaut = true;
        previousPointerX = event.clientX;
        previousPointerY = event.clientY;

        astronautRenderer.domElement
            .setPointerCapture(
                event.pointerId
            );
    }
);

astronautRenderer.domElement.addEventListener(
    "pointermove",
    (event) => {

        if (!isDraggingAstronaut ||!astronautModel) {
            return;
        }
        const deltaX = event.clientX - previousPointerX;
        const deltaY = event.clientY - previousPointerY;

        dragRotationY += deltaX * 0.01;
        dragRotationX += deltaY * 0.01;

        // Prevent awkward flipping
        dragRotationX = Math.max(-1 , Math.min(1,dragRotationX));
        previousPointerX = event.clientX;
        previousPointerY = event.clientY;
    }
);

astronautRenderer.domElement.addEventListener(
    "pointerup",
    (event) => {

        isDraggingAstronaut = false;
        astronautRenderer.domElement
            .releasePointerCapture(
                event.pointerId
            );
    }
);

astronautRenderer.domElement.addEventListener(
    "pointerleave",
    () => {
        isDraggingAstronaut = false;
    }
);

// GET CURRENT LOCATION

function getCurrentLocation() {

    return new Promise(
        (resolve, reject) => {

            navigator.geolocation.getCurrentPosition(
                (position) => {
                    resolve({
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude
                    });
                },
                (error) => {
                    reject(error);
                }
            )
        }
    )
};

// GET CURRENT COUNTRY

async function getCurrentCountry(latitude,longitude) {

    const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
    if (!response.ok) {
        throw new Error(
            "Could not find current country"
        );
    }

    const data = await response.json();
    return data.address.country_code.toUpperCase();
}
// MUSIC
const musicButton = document.getElementById("mscButton");
const bgMusic = document.getElementById("msc");

bgMusic.volume = 1;

window.addEventListener("load", () => {
    bgMusic.play()
        .then(() => {
            musicButton.textContent = "🎵";
        })
        .catch(() => {
            musicButton.textContent = "🔇";
        });
});

musicButton.addEventListener("click", () => {
    if (bgMusic.paused) {
        bgMusic.play();
        musicButton.textContent = "🎵";
    } else {
        bgMusic.pause();
        musicButton.textContent = "🔇";
    }
});
// INPUT

input.addEventListener("input",() => {
        input.setCustomValidity("");
    }
);

// LOCATION BUTTON

locationButton.addEventListener("click", () =>{

        if (smallPhone.matches || NormalPhone.matches || tablet.matches) {

            document.getElementById("globeViz").scrollIntoView(
                {
                    behavior: "smooth",
                    block: "start"
                }
            );
        }
    }
);
 
// SEARCH

form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const country = input.value.trim();

    if (!country) {
        input.setCustomValidity("Please enter a country");
        input.reportValidity();
        return;
    }

    try {
       
        const data = await getCountryData(country);

        if (smallPhone.matches || NormalPhone.matches || tablet.matches) {
            locationButton.classList.add("show"); 
        }
        if (desktop.matches) {
          document.body.style.overflow = "hidden";
          document.documentElement.style.overflow = "hidden";
        }
  
        container.classList.add("hide");
        form.classList.add("hidenone");
        astronautContainer.classList.add("hiide");
        infos.classList.add("hide");
        watermark.classList.add("hide")
    
        await displayCountryData(data);

        input.setCustomValidity("");
        }

    catch (error) {
        console.error(error);
        input.setCustomValidity("Could not find this country, Please try again.");
        input.reportValidity();

    }
});

// COUNTRIES PROMISE

async function loadCountries() {

    const response = await fetch("https://countries.dev/countries?fields=name,alpha2Code,alpha3Code");

    if (!response.ok) {
        throw new Error("Could not load countries");
    }
    const countries = await response.json();
    countries.sort((a, b) =>
        a.name.localeCompare(b.name)
    );
    return countries;
}

// NATURAL EARTH PROMISE

async function loadNaturalEarth() {

    const response = await fetch("https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_admin_0_countries_iso.geojson");

    if (!response.ok) {
        throw new Error("Could not load Natural Earth data");
    }

    const data = await response.json();
    naturalEarthData = data;
    naturalEarthByISO.clear();

    for (const feature of data.features) {

        const p = feature.properties;
        const codes = [
            p.ISO_A3,
            p.ISO_A3_EH,
            p.ADM0_A3,
            p.WB_A3,
            p.SOV_A3
        ];
        for (const code of codes) {

            if (
                code &&
                code !== "-99" &&
                !naturalEarthByISO.has(code)
            ) {
                naturalEarthByISO.set(
                    code,
                    feature
                );
            }
        }
    }
    return data;
}

// CLOUD PROMISE

function loadClouds() {

    return new Promise((resolve, reject) => {

        new THREE.TextureLoader().load(CLOUDS_IMG_URL, (cloudsTexture) => {

                const clouds = new THREE.Mesh(
                    new THREE.SphereGeometry(
                        world.getGlobeRadius() * (1 + CLOUDS_ALT),75,75
                    ),
                    new THREE.MeshPhongMaterial({
                        map: cloudsTexture,
                        transparent: true
                    })
                );
                world.scene().add(clouds);
                function rotateClouds() {
                    clouds.rotation.y +=
                        CLOUDS_ROTATION_SPEED * Math.PI / 180;

                    requestAnimationFrame(rotateClouds);
                }
                rotateClouds();
                console.log("Clouds loaded");
                resolve(clouds);
            },

            undefined,

            (error) => {
                console.error("Cloud texture failed:", error);
                reject(error);
            }
        );
    });
}

// ASTRONAUT PROMISE

function loadAstronaut() {

    return new Promise((resolve, reject) => {

        gltfLoader.load("./astronaut.glb", (gltf) => {

                astronautModel = gltf.scene;
                const box = new THREE.Box3().setFromObject(astronautModel);
                const size = new THREE.Vector3();
                box.getSize(size);

                const maxDim = Math.max(size.x, size.y, size.z);
                const desiredSize = 2.2;

                astronautModel.scale.setScalar(desiredSize / maxDim);
                astronautScene.add(astronautModel);

                if (gltf.animations && gltf.animations.length > 0) {

                    astronautMixer = new THREE.AnimationMixer(
                            astronautModel
                        );

                    astronautMixer.clipAction(gltf.animations[0]).play();
                }
                resolve(astronautModel);
            },

            undefined,

            (error) => {

                console.error(
                    "Astronaut failed to load:",
                    error
                );
                reject(error);
            }
        );
    });
}

// CREATE ALL PROMISES

const countriesPromise =
    loadCountries();

const naturalEarthPromise =
    loadNaturalEarth();

const cloudsPromise =
    loadClouds();

const astronautPromise =
    loadAstronaut();

// WEBSITE INITIALIZATION

async function initializeWebsite() {

    const loadingScreen = document.getElementById("loadingScreen");
    const app = document.getElementById("app");

    try {

        await Promise.all([
            countriesPromise,
            naturalEarthPromise,
            cloudsPromise,
            astronautPromise
        ]);

        allCountries = await countriesPromise;

        loadingScreen.style.display = "none";
        app.classList.add("loaded");

    }

    catch (error) {

        console.error("Website initialization failed:",error);

        // Keep the loading screen visible instead of showing a broken website.

        loadingScreen.innerHTML = `
            <div class="loadingError" style="color:white">
                <h2>Something went wrong</h2>
                <p>Please refresh the page.</p>
            </div>
        `;
    }
}

initializeWebsite();

// AUTOCOMPLETE

input.addEventListener("input", () => {

        const value = input.value.trim().toLowerCase();
        datalist.innerHTML = "";

        if (!value) {
            return;
        }

        const filteredCountries = allCountries.filter((country) =>
             country.name.toLowerCase() !=="israel" && country.name.toLowerCase().startsWith(value)
            );

        filteredCountries.forEach((country) => {

             const option = document.createElement("option");
             option.value = country.name;
             datalist.appendChild(option);

            }
        );
    }
);

// GET COUNTRY DATA

async function getCountryData(country) {

    const countryName = country.trim().toLowerCase();

    // PALESTINE

    if (countryName === "palestine") {

        const response = await fetch("https://countries.dev/alpha/PS");

        if (!response.ok) {
            throw new Error("Try again later");
        }
        const data = await response.json();
        return [data];
    }

    // ISRAEL

    if (countryName ==="israel") {
        throw new Error("country not found");
    }

    // SPECIAL INPUT NAMES
    
    const searchNames = {
        "south korea": "Korea (Republic of)",
        "north korea": "Korea (Democratic People's Republic of)",
        "uk": "United Kingdom of Great Britain and Northern Ireland",
        "usa": "United States of America",
        "emirates": "United Arab Emirates",
        "iran": "iran (islamic republic of)",
        "syrie": "syrian arab republic"
    };


    const searchName = searchNames[countryName] || country;

    // FIND COUNTRY
    
    const foundCountry = allCountries.find(c =>
                c.name.trim().toLowerCase() === searchName.trim().toLowerCase()
    );

    if (!foundCountry) {
        console.log("Could not find:",searchName);
        throw new Error("Country not found");
    }

    // FETCH COUNTRY DATA

    const response = await fetch(`https://countries.dev/alpha/${foundCountry.alpha2Code}`);

    if (!response.ok) {
        throw new Error("Country not found");
    }

    const data = await response.json();

    return Array.isArray(data) ? data : [data];

}

// GET BORDER NAMES

function getBorderNames(borders) {

    return borders

        .filter(code =>
            code !== "ISR"
        )
        .map(code => {
                const country = allCountries.find(country =>
                            country.alpha3Code === code
                    );

                return country ? country.name : code;
              }
        )
};

// HAVERSINE DISTANCE

function calculateDistance(lat1,lon1,lat2,lon2) {

    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) /180;
    const dLon =((lon2 - lon1) * Math.PI) /180;

    const a = Math.sin(dLat / 2) ** + 
              Math.cos((lat1 * Math.PI) / 180) *
              Math.cos((lat2 * Math.PI) / 180) *
              Math.sin(dLon / 2) ** 2;

    const c = 2 * Math.atan2(Math.sqrt(a),Math.sqrt(1 - a));
    return R * c;

}

// GET NATURAL EARTH POLYGON

function getNaturalEarthPolygon(alpha3Code) {

    const feature =naturalEarthByISO.get(alpha3Code);

    if (!feature) {
        console.log("No Natural Earth match found for",alpha3Code);
        return null;
    }
    return feature;
}

// POLYGON AREA

function polygonArea(ring) {

    let area = 0;
    
    for (let i = 0; i < ring.length - 1; i++) {

        const [x1,y1] = ring[i];
        const [x2,y2] = ring[i + 1];
        area += x1 * y2 - x2 * y1;

    }

    return Math.abs(
        area / 2
    );
}

// MAIN POLYGON BOUNDS

function getMainPolygonBounds(feature,minAreaFraction = 0.15) {

    const geom = feature.geometry;
    const polygons = geom.type === "MultiPolygon" ? geom.coordinates : [geom.coordinates];
    const withAreas = polygons.map(poly => (
        
        {
            poly,
            area: polygonArea(poly[0])
            })
        );
    const maxArea =
        Math.max(...withAreas.map(
                p => p.area
            )
        );

    const significant =
        maxArea > 0 ? withAreas.filter(
                p =>
                    p.area >=
                    maxArea *
                    minAreaFraction
            )
            : withAreas;

    let minLat = Infinity;
    let maxLat = -Infinity;
    let minLng = Infinity;
    let maxLng = -Infinity;

    significant.forEach(({ poly }) => {
            poly.forEach(
                ring => {
                    ring.forEach(
                        ([lng, lat]) => {

                            if (lat < minLat) {
                                minLat = lat;
                            }
                            if (lat > maxLat) {
                                maxLat = lat;
                            }
                            if (lng < minLng) {
                                minLng = lng;
                            }
                            if (lng > maxLng) {
                                maxLng = lng;
                            }
                        }
                    );
                }
            );
        }
    );

    return {
        minLat,
        maxLat,
        minLng,
        maxLng
    };
}

// ALTITUDE FROM BOUNDS

function altitudeForBounds(bounds) {

    const defaultAltitude = getScreenAltitudeAndSpeed().search;
    const latSpan = bounds.maxLat - bounds.minLat;
    const lngSpan = bounds.maxLng - bounds.minLng;
    const span = Math.max(latSpan,lngSpan);

    if (!isFinite(span)) {
        return defaultAltitude;
    }
    if (span < 0.5) {
        return 0.45;
    }
    if (span < 2) {
        return 0.45;
    }
    if (span < 8) {
        return 0.7;
    }
    return defaultAltitude;
}

// DISPLAY COUNTRY DATA

async function displayCountryData(data) {

    // Prevent old searches from overwriting newer searches
    const searchId = ++currentSearchId;

    const [
           {name: apiCountryName,
            alpha2Code,
            alpha3Code,
            nativeName,
            flags: {png},
            area,
            capital,
            callingCodes: [callcode],
            currencies: [{name : currencyName , symbol}],
            languages: [{name:language}],
            population,
            subregion,
            timezones,
            latlng,
            borders
           }
         ] = data;

    document.getElementById("globeViz").classList.add("search-active");
   

    // MANUAL COORDINATES (unavailable in the api :) )

    const missingCountryLatlngs = {
        "ABW": [12.5211, -69.9683],
        "AIA": [18.2208, -63.0517],
        "ALA": [60.1785, 19.9156],
        "AND": [42.5063, 1.5218],
        "ASM": [-14.2710, -170.1322],
        "ATG": [17.0608, -61.7964],
        "BES": [12.2019, -68.2624],
        "BHR": [26.0667, 50.5577],
        "BLM": [17.9000, -62.8333],
        "BRB": [13.1939, -59.5432],
        "BVT": [-54.4208, 3.3464],
        "CCK": [-12.1642, 96.8710],
        "COK": [-21.2367, -159.7777],
        "COM": [-11.6455, 43.3333],
        "CPV": [16.5388, -23.0418],
        "CUW": [12.1696, -68.9900],
        "CXR": [-10.4475, 105.6904],
        "CYM": [19.3133, -81.2546],
        "DMA": [15.4150, -61.3710],
        "FRO": [61.8926, -6.9118],
        "FSM": [7.4256, 150.5508],
        "GGY": [49.4657, -2.5853],
        "GIB": [36.1408, -5.3536],
        "GLP": [16.2650, -61.5510],
        "GRD": [12.1165, -61.6790],
        "GUM": [13.4443, 144.7937],
        "HKG": [22.3193, 114.1694],
        "HMD": [-53.0818, 73.5042],
        "IMN": [54.2361, -4.5481],
        "IOT": [-6.3432, 71.8765],
        "JEY": [49.1900, -2.1100],
        "KIR": [1.8709, -157.3630],
        "KNA": [17.3578, -62.7820],
        "LCA": [13.9094, -60.9789],
        "LIE": [47.1660, 9.5554],
        "MAC": [22.1987, 113.5439],
        "MAF": [18.0708, -63.0501],
        "MCO": [43.7384, 7.4246],
        "MDV": [3.2028, 73.2207],
        "MHL": [7.1315, 171.1845],
        "MNP": [15.0979, 145.6739],
        "MSR": [16.7425, -62.1874],
        "MTQ": [14.6415, -61.0242],
        "MUS": [-20.3484, 57.5522],
        "MYT": [-12.8275, 45.1662],
        "NFK": [-29.0408, 167.9547],
        "NIU": [-19.0544, -169.8672],
        "NRU": [-0.5228, 166.9315],
        "PCN": [-25.0660, -130.1000],
        "PLW": [7.5150, 134.5825],
        "PYF": [-17.6797, -149.4068],
        "REU": [-21.1351, 55.2471],
        "SGP": [1.3521, 103.8198],
        "SGS": [-54.4296, -36.5879],
        "SHN": [-15.9650, -5.7089],
        "SJM": [77.5536, 23.6703],
        "SMR": [43.9424, 12.4578],
        "SPM": [46.8852, -56.3159],
        "STP": [0.1864, 6.6131],
        "SXM": [18.0425, -63.0548],
        "SYC": [-4.6796, 55.4920],
        "TCA": [21.6940, -71.7979],
        "TKL": [-9.2000, -171.8000],
        "TON": [-21.1790, -175.1982],
        "TUV": [8.6195, 179.1940],
        "UMI": [19.2823, 166.6470],
        "VAT": [41.9029, 12.4534],
        "VCT": [13.1579, -61.2248],
        "VGB": [18.4207, -64.6400],
        "VIR": [18.3358, -64.8963],
        "WLF": [-13.7687, -177.1561],
        "WSM": [-13.7590, -172.1046]
    };

    // PALESTINE COORDINATES

    const countryLatlngs = {"Palestine, State of":[31.55, 34.95]};

    // CHOOSE COORDINATES

    const targetLatlng = 
        missingCountryLatlngs[alpha3Code] ||
        countryLatlngs[apiCountryName] || 
        latlng;

    // MOVE GLOBE

    if (targetLatlng) {
        world.controls().autoRotate = true;
        world.pointOfView(
            {
                lat:targetLatlng[0],
                lng:targetLatlng[1],
                altitude:getScreenAltitudeAndSpeed().search
            },
            2500
        );

        setTimeout(() => {
                world.controls().autoRotate = false;
            },
            2500
        );
    }

    // LOAD COUNTRY POLYGON

    let countries = [];

    // PALESTINE

    if (apiCountryName === "Palestine, State of") {

        const palestineUrls = [
            "https://raw.githubusercontent.com/johan/world.geo.json/master/countries/PSE.geo.json",
            "https://raw.githubusercontent.com/johan/world.geo.json/master/countries/ISR.geo.json"
        ];
        const results =
            await Promise.all(
                palestineUrls.map(async url => {

                        try {

                            const response = await fetch(url);
                            if (!response.ok) {
                                return null;
                            }
                            return await response.json();
                        }

                        catch {
                            return null;
                        }
                    }
                )
            );
        countries = results
                   .filter(data =>
                           data !== null
                   )
   
                   .flatMap(data =>
                           data.features || []
                   );
    }

    // NORMAL COUNTRY

    else {
        const normalUrl = `https://raw.githubusercontent.com/johan/world.geo.json/master/countries/${alpha3Code}.geo.json`;

        try {

            const response = await fetch(normalUrl);

            if (response.ok) {
                const data = await response.json();
                countries = data.features || [];
            }
        }
        catch {
            console.log("Normal GeoJSON unavailable:",alpha3Code);
        }

        // NATURAL EARTH FALLBACK

        if (countries.length === 0) {

            console.log(`${alpha3Code} missing from johan/world.geo.json`);

            const manualPolygon = getNaturalEarthPolygon(alpha3Code);

            if (manualPolygon) {

                countries = [manualPolygon];
                console.log(`Using Natural Earth polygon for ${alpha3Code}`);
            }

            else {

                console.log(`No polygon found for ${alpha3Code}`);
            }
        }
    }

    // Ignore old search

    if (searchId !== currentSearchId) {
        return;
    }

    // DISPLAY POLYGON

    if (countries.length > 0) {

        world
            .polygonsData(countries)
            .polygonCapColor(() =>
                    "rgba(200, 253, 253, 0.17)"
            )
            .polygonSideColor(() =>
                    "rgba(52, 146, 146, 0.31)"
            )
            .polygonStrokeColor(() =>
                    "rgb(255, 255, 255)"
            )
            .polygonAltitude(0.01);

        const bounds = getMainPolygonBounds(countries[0]);
        const centerLat = (bounds.minLat + bounds.maxLat) / 2;
        const centerLng =(bounds.minLng + bounds.maxLng) / 2;
        const finalAltitude = altitudeForBounds(bounds);

        if (isFinite(centerLat) && isFinite(centerLng)) {

            world.pointOfView(
                {
                    lat:centerLat,
                    lng:centerLng,
                    altitude:finalAltitude
                },
                2000
            );
        }
    }

    else {
        world.polygonsData([]);
    }

    // PALESTINE CUSTOM DATA

    const countryAreas = {"Palestine, State of" : 28042};
    const countryCurrencies = {"Palestine, State of" : "Israeli new shekel"};
    const countryCurrenciesSymbol = {"Palestine, State of" : "₪"};
    const countryPopulations = {"Palestine, State of" : "7.560.000"};
    const countryCapitals = {"Palestine, State of" : "Al-Quds"};
    const countryArea = countryAreas[apiCountryName] || area;
    const countryCurrency = countryCurrencies[apiCountryName] || currencyName;
    const countryCurrencySymbol = countryCurrenciesSymbol[apiCountryName] || symbol;
    const countryPopulation =countryPopulations[apiCountryName] || population;
    const countryCapital = countryCapitals[apiCountryName] || capital;

    // COUNTRY NAME ( unnecessary long names on display so i decided to change some <3 )

    const countryNames = {
        "Korea (Democratic People's Republic of)":"North Korea",
        "Korea (Republic of)":"South Korea",
        "Palestine, State of":"Palestine",
        "United Kingdom of Great Britain and Northern Ireland":"United Kingdom",
        "iran (islamic republic of)":"Iran",
        "syrian arab republic":"Syria"
    };

    const country = countryNames[apiCountryName] || apiCountryName;

    // SHOW CARD

    card.classList.remove("show");
    void card.offsetWidth;
    card.classList.add("show");

    // FLAG

    const Flag = card.querySelector(".img");
    Flag.crossOrigin = "Anonymous";
    Flag.onload = () => {

        try {

            const colorThief = new ColorThief();
            const colors =colorThief.getPalette(Flag,3);

            const gradient = colors.map(([r, g, b]) =>`rgb(${r}, ${g}, ${b})`).join(", ");
            card.style.background =`linear-gradient(135deg, ${gradient})`;

            const [c1,c2,c3] = colors;

            card.addEventListener("mouseenter",() => {

                    card.style.boxShadow = 
                        `0 0 20px rgba(
                            ${c1[0]},
                            ${c1[1]},
                            ${c1[2]},
                            0.8
                        ),

                        0 0 20px rgba(
                            ${c2[0]},
                            ${c2[1]},
                            ${c2[2]},
                            0.8
                        ),

                        0 0 20px rgba(
                            ${c3[0]},
                            ${c3[1]},
                            ${c3[2]},
                            0.8
                        )
                    `;
                }
            );

            card.addEventListener("mouseleave",() => {

                    card.style.boxShadow =
                        "0 0 25px rgba(0, 255, 255, 0.15)";
                }
            );
        }

        catch (error) {

            console.error("Could not get flag colors:",error);
        }
    };
    Flag.src = png;

    // CARD NAME

    card.querySelector(".h2name").textContent = country;

    card.querySelector(".native").textContent =nativeName;

    // CARD DETAILS

    const rest = document.querySelector(".theRest");
    const separator = rest.querySelector(".separator");
    rest.textContent = "";

    // AREA

    const Area = document.createElement("h3");
    Area.textContent = `📐 Area : ${countryArea.toLocaleString()} km²`;
    rest.appendChild(Area);

    // CAPITAL

    const Capital = document.createElement("h3");
    Capital.textContent = `🏛️ Capital : ${countryCapital}`;
    rest.appendChild(Capital);

    // CALLING CODE

    const Callingcode = document.createElement("h3");
    Callingcode.textContent = `📞 Calling Code : +${callcode}`;
    rest.appendChild(Callingcode);

    // CURRENCY

    const Currency = document.createElement("h3");
    Currency.textContent = `💵 Currency : ${countryCurrency} "${countryCurrencySymbol}"`
    rest.appendChild(Currency);

    // LANGUAGE

    const Language = document.createElement("h3");
    Language.textContent = `🌐 Language : ${language}`;
    rest.appendChild(Language);

    // POPULATION

    const Population = document.createElement("h3");
    Population.textContent = `👥 Population : ${countryPopulation.toLocaleString()} people`;
    rest.appendChild(Population);

    // REGION

    const Subregion = document.createElement("h3");
    Subregion.textContent = `🗺️ Region : ${subregion}`;
    rest.appendChild(Subregion);

    // DISTANCE

    const Distance = document.createElement("h3");
    Distance.textContent = "📍 Distance from you : Calculating...";
    rest.appendChild(Distance);

    // SEPARATOR

    rest.appendChild(separator);

    // BORDERS

    const Borders = document.createElement("h3");

    if (borders && borders.length > 0) {

        const borderNames = getBorderNames(borders);
        Borders.innerHTML = `🌍 Borders :<br><span>${borderNames.join("  ,  ")}</span>`;

    }

    else {
        Borders.textContent = "🌍 Borders : None";
    }
    rest.appendChild(Borders);
  
    // LOCAL TIME

    function updateTime() {

        const timezone = timezones[0];
        let offsetMinutes = 0;
        if (timezone !== "UTC") {
            const sign = timezone.includes("+") ? 1 : -1;
            const offset = timezone.replace("UTC+", "").replace("UTC-", "");
            const [hours,minutes] = offset.split(":").map(Number);
            offsetMinutes = sign * (hours * 60 + minutes);
        }

        const now = new Date();
        const utcTime = now.getTime() + now.getTimezoneOffset() * 60000;
        const countryTime = new Date(utcTime + offsetMinutes * 60000);

        const localTime =
            countryTime.toLocaleTimeString("en-US",
                {
                    hour:"2-digit",
                    minute:"2-digit",
                    second:"2-digit",
                    hour12:true
                }
            );

        const Time = card.querySelector(".time")
        Time.innerHTML = `🕓 Now in ${country}:<br><span>${localTime}</span>`;
    }

    clearInterval(timeInterval);
    updateTime();

    timeInterval =
        setInterval(
            updateTime,
            1000
        );

    // DISTANCE

    try {

        const currentLocation = await getCurrentLocation();
        const currentCountry = await getCurrentCountry(currentLocation.latitude , currentLocation.longitude);

        if (currentCountry === alpha2Code.toUpperCase()) {
            Distance.textContent = "📍 Distance from you : 0 km";
        }

        else if (targetLatlng) {

            const distance =
                calculateDistance(
                    currentLocation.latitude,
                    currentLocation.longitude,
                    targetLatlng[0],
                    targetLatlng[1]
                );


            Distance.textContent = `📍 Distance from you : ${Math.round(distance).toLocaleString()} km`;
        }

        else {
            Distance.textContent = "📍 Distance : Unavailable";
        }
    }
    catch (error) {

        Distance.textContent = "📍 Distance : Location unavailable";
    }
}
