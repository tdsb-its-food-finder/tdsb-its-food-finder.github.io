const accessToken = MAPBOX_ACCESS_TOKEN;
const MAPBOX_STYLE = 'kevinmao1999/cmvv2pgms008n01s2a9jgctrx';
const DESKTOP_DEFAULT_CENTER = [43.6923, -79.43071];
const MOBILE_DEFAULT_CENTER = [43.68073383347655, -79.43301218739757];
const DESKTOP_DEFAULT_ZOOM = 12;
const MOBILE_DEFAULT_ZOOM = 10; // Adjust this value to your preferred mobile zoom level

function getDefaultZoom() {
  return window.innerWidth <= 768 ? MOBILE_DEFAULT_ZOOM : DESKTOP_DEFAULT_ZOOM;
}
function getDefaultCenter() {
  return window.innerWidth <= 768 ? MOBILE_DEFAULT_CENTER : DESKTOP_DEFAULT_CENTER;
}

const CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTmdqwmsBGqKFd6BcAalcgXSxlwoJhFv8j-D9sPoqyBsKRSbwMTD5JXQBYYqmk1Qj2irHycVrzQC3ID/pub?gid=0&single=true&output=csv';

// pins
const pinYellow = L.icon({
  iconUrl: 'img/pin_yellow.png',
  iconSize: [20, 20],
  iconAnchor: [10, 10],
  popupAnchor: [0, -10]
});
const pinHoverYellow = L.icon({
  iconUrl: 'img/pinhover_yellow.png',
  iconSize: [20, 20],
  iconAnchor: [10, 10],
  popupAnchor: [0, -10]
});
const pinOrange = L.icon({
  iconUrl: 'img/pin_orange.png',
  iconSize: [20, 20],
  iconAnchor: [10, 10],
  popupAnchor: [0, -10]
});
const pinHoverOrange = L.icon({
  iconUrl: 'img/pinhover_orange.png',
  iconSize: [20, 20],
  iconAnchor: [10, 10],
  popupAnchor: [0, -10]
});
const pinRed = L.icon({
  iconUrl: 'img/pin_red.png',
  iconSize: [20, 20],
  iconAnchor: [10, 10],
  popupAnchor: [0, -10]
});
const pinHoverRed = L.icon({
  iconUrl: 'img/pinhover_red.png',
  iconSize: [20, 20],
  iconAnchor: [10, 10],
  popupAnchor: [0, -10]
});
const pinGreen = L.icon({
  iconUrl: 'img/pin_green.png',
  iconSize: [20, 20],
  iconAnchor: [10, 10],
  popupAnchor: [0, -10]
});
const pinHoverGreen = L.icon({
  iconUrl: 'img/pinhover_green.png',
  iconSize: [20, 20],
  iconAnchor: [10, 10],
  popupAnchor: [0, -10]
});
const pinBlue = L.icon({
  iconUrl: 'img/pin_blue.png',
  iconSize: [20, 20],
  iconAnchor: [10, 10],
  popupAnchor: [0, -10]
});
const pinHoverBlue = L.icon({
  iconUrl: 'img/pinhover_blue.png',
  iconSize: [20, 20],
  iconAnchor: [10, 10],
  popupAnchor: [0, -10]
});

// ================================================================================================================================================================
// initialization
// ================================================================================================================================================================
// map initialization
const map = L.map('map', {
  zoomSnap: 0.25,
  zoomDelta: 0.25,
  wheelPxPerZoomLevel: 75
}).setView(getDefaultCenter(), getDefaultZoom());

// load Mapbox tiles onto Leaflet map
if (accessToken && accessToken.trim() !== '') {
  L.tileLayer(
    `https://api.mapbox.com/styles/v1/${MAPBOX_STYLE}/tiles/512/{z}/{x}/{y}@2x?access_token=${accessToken}`,
    {
      tileSize: 512,
      zoomOffset: -1,
      maxZoom: 16,
      minZoom: 10,
      attribution: '&copy; <a href="https://www.mapbox.com/about/maps/">Mapbox</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }
  ).addTo(map);
}

// global lists
let allRestaurants = [];
const markersGroup = L.layerGroup().addTo(map);

// ================================================================================================================================================================
// fetch and parse CSV data before initializing everything
// ================================================================================================================================================================
function fetchSheetData() {
  Papa.parse(CSV_URL, {
    download: true,
    header: true,
    skipEmptyLines: true,
    worker: true,

    // create objects with parsed information and add to allRestaurants list
    complete: function(results) {
      allRestaurants = results.data.map((place) => {
        const name = place['Name'];
        const latLngStr = place['Lat, Lng'] || '';
        const coords = latLngStr.split(',').map(c => parseFloat(c.trim()));
        const distance = parseFloat(place['Distance (km)']);
        const type = place['Type'];
        const region = place['Region'];

        let icon = pinGreen;
        let hoverIcon = pinHoverGreen;

        if (type === 'ITS') {
          icon = pinBlue;
          hoverIcon = pinHoverBlue;
        } else if (distance < 3) {
          icon = pinGreen;
          hoverIcon = pinHoverGreen;
        } else if (distance >=3 && distance <= 6) {
          icon = pinYellow;
          hoverIcon = pinHoverYellow;
        } else if (distance >= 6 && distance <= 8) {
          icon = pinOrange;
          hoverIcon = pinHoverOrange;
        } else if (distance > 8) {
          icon = pinRed;
          hoverIcon = pinHoverRed;
        }

        // build and return object with parsed data
        return {
          ...place,
          name: name,
          lat: coords[0],
          lng: coords[1],
          isValidLocation: !isNaN(coords[0]) && !isNaN(coords[1]),
          cardId: `card-${name.replace(/\s+/g, '-').toLowerCase()}`,
          isFav: place['Favourite?'] && place['Favourite?'].toLowerCase().trim() === 'yes',
          icon: icon,
          hoverIcon: hoverIcon
        };
      });

      // render initial state
      renderMarkers(allRestaurants);
      updateVisibleSidebar();

      map.off('moveend', updateVisibleSidebar);
      map.on('moveend', () => handleSearch());
    }
  });
}

// check if restaurant coordinates fall within visible map bounds
function isRestaurantVisible(place, bounds) {
  if (!place.isValidLocation) return false;
  return bounds.contains([place.lat, place.lng]);
}

// ================================================================================================================================================================
// renders pins on map, given locations
// ================================================================================================================================================================
function renderMarkers(locations) {
  markersGroup.clearLayers();

  locations.forEach((place) => {
    // initialize marker and add to group
    const marker = L.marker([place.lat, place.lng], { icon: place.icon }).addTo(markersGroup);

    // set up hover tooltip on markers
    marker.bindTooltip(place.name, {
      direction: 'top',
      offset: [0, -2],
      opacity: 1,
      className: 'custom-tooltip'
    });

    // Only attach hover effects on devices that actually support hover (desktop)
    if (window.matchMedia('(hover: hover)').matches) {
      marker.on('mouseover', () => {
        marker.setIcon(place.hoverIcon);
        const targetCard = document.querySelector(`[data-card-id="${place.cardId}"]`);
        if (targetCard) {
          targetCard.classList.add('highlighted');
          targetCard.scrollIntoView({ behavior: 'instant', block: 'nearest' });
        }
      });

      marker.on('mouseout', () => {
        marker.setIcon(place.icon);
        const targetCard = document.querySelector(`[data-card-id="${place.cardId}"]`);
        if (targetCard) targetCard.classList.remove('highlighted');
      });
    }

    if (place.Type !== "ITS") {
      // onclick, open detail modal
      marker.on('click', () => openDetailModal(place));
    }
  });
}

// ================================================================================================================================================================
// render a sidebar that has info based on currently visible locations
// ================================================================================================================================================================
function renderSidebar(visibleLocations) {
  const listContainer = document.getElementById('restaurantList');
  listContainer.innerHTML = '';

  if (visibleLocations.length === 0) {
    listContainer.innerHTML = '<p class="placeholder-text">No restaurants in this map view.</p>';
    return;
  }

  visibleLocations.forEach((place) => {
    const card = document.createElement('div');
    card.className = 'restaurant-card';
    card.setAttribute('data-card-id', place.cardId);

    card.innerHTML = `
      ${place.isFav ? '<span class="fav-badge">❤️</span>' : ''}
      <h3>${place.name}</h3>
      <p><strong>${place['Cuisine']}</strong> </p>
      <p style="color: #888; font-size: 0.8rem; margin-top: 2px;">${place['Location']}<br>${place['Distance (km)']} km from ${place['Region']}</p>
    `;

    card.addEventListener('click', () => {
    map.flyTo([place.lat, place.lng], 16);
    openDetailModal(place);

    // Collapse drawer on mobile selection to reveal full map view
    if (window.innerWidth <= 768) {
      document.querySelector('.sidebar').classList.add('collapsed');
    }
  });

    listContainer.appendChild(card);
  });
}

// ================================================================================================================================================================
// re-renders sidebar with new set of visible locations
// ================================================================================================================================================================
function updateVisibleSidebar(dataToFilter = allRestaurants) {
  const bounds = map.getBounds();

  const visibleRestaurants = dataToFilter.filter((place) => {
    const type = place['Type'];
    if (type === 'ITS') return false;
    return isRestaurantVisible(place, bounds);
  });

  renderSidebar(visibleRestaurants);
}

// ================================================================================================================================================================
// search and filter handler
// ================================================================================================================================================================
// Helper to strip out all non-alphanumeric characters and normalize text
function normalizeText(text) {
  if (!text) return '';
  return text.toLowerCase().replace(/[^a-z0-9]/g, '');
}
function handleSearch() {
  const searchTerm = normalizeText(document.getElementById('searchInput').value);

  const filteredRestaurants = allRestaurants.filter((place) => {
    // Always keep office/ITS marker on map
    if (place.Type === 'ITS') return true;

    // Normalize target fields
    const name = normalizeText(place['Name']);
    const cuisine = normalizeText(place['Cuisine']);
    const region = normalizeText(place['Region']);
    const location = normalizeText(place['Location']);
    const description = normalizeText(place['Description']);

    return (
      name.includes(searchTerm) ||
      cuisine.includes(searchTerm) ||
      region.includes(searchTerm) ||
      location.includes(searchTerm) ||
      description.includes(searchTerm)
    );
  });

  // Re-render markers for matching spots
  renderMarkers(filteredRestaurants);

  // Update sidebar list for matching spots inside map view
  updateVisibleSidebar(filteredRestaurants);
}

// Attach event listener to search input
document.getElementById('searchInput').addEventListener('input', handleSearch);

// ================================================================================================================================================================
// opens info modal onclick
// ================================================================================================================================================================
function openDetailModal(place) {  
  const modal = document.getElementById('detailModal');
  const modalBody = document.getElementById('modalBody');

  // helper function to create web links
  const createLink = (url, label) => {
    if (!url || url.trim() === '') return '';
    let icon = '';

    switch (label) {
      case "Map":
        icon = '<i class="fa-solid fa-location-dot"></i>';
        break;
      case "Site":
        icon = '<i class="fa-solid fa-link"></i>';
        break;
      case "Instagram":
        icon = '<i class="fa-brands fa-instagram"></i>';
        break;
      case "Facebook":
        icon = '<i class="fa-brands fa-facebook"></i>';
        break;
      case "TikTok":
        icon = '<i class="fa-brands fa-tiktok"></i>';
        break;
      case "YouTube":
        icon = '<i class="fa-brands fa-youtube"></i>';
        break;
      case "Twitter":
        icon = '<i class="fa-brands fa-twitter"></i>';
        break;
      default:
        icon = '';
    }
    return `<a href="${url}" target="_blank" rel="noopener noreferrer" style="margin-right: 10px; text-decoration: none; color: #2c3e50; font-size: 24px; font-weight: bold;">${icon}</a>`;
  };

  modalBody.innerHTML = `
    <h2 style="margin-bottom: 4px;">${place['Name']} ${place.isFav ? '🩷' : ''}</h2>
    <p style="color: #666; margin-bottom: 12px;">
      <strong>${place['Cuisine']}</strong> • ${place['Type']}
      <br>
      ${place['Distance (km)']} km from ${place['Region']}
      <span style="display: block; margin-top: 6px;">${place['Address']}</span>
    </p>
    
    ${`<p style="margin-bottom: 12px;">${place['Description']}</p>`}
    ${`<p style="margin-bottom: 12px;"><strong>Menu Highlights:</strong> ${place['Menu Highlights']}.</p>`}
    
    <hr style="border: 0; border-top: 1px solid #eee; margin: 16px 0;" />
    
    <div style="display: flex; flex-wrap: wrap; gap: 8px;">
      ${createLink(place['Google Maps'], 'Map')}
      ${createLink(place['Website'], 'Site')}
    </div>
    <div style="display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px;">
      ${createLink(place['Instagram'], 'Instagram')}
      ${createLink(place['Facebook'], 'Facebook')}
      ${createLink(place['TikTok'], 'TikTok')}
      ${createLink(place['YouTube'], 'YouTube')}
      ${createLink(place['Twitter'], 'Twitter')}
    </div>
  `;

  modal.classList.remove('hidden');
}

// event handlers for closing modals
document.getElementById('closeModalBtn').addEventListener('click', () => {
  document.getElementById('detailModal').classList.add('hidden');
});
document.getElementById('detailModal').addEventListener('click', (e) => {
  if (e.target.id === 'detailModal') {
    document.getElementById('detailModal').classList.add('hidden');
  }
});

// ================================================================================================================================================================
// reset button handler
// ================================================================================================================================================================
function resetMapView() {
  // 1. Reset map zoom and position to responsive default center & zoom
  map.setView(getDefaultCenter(), getDefaultZoom());

  // 2. Clear search input field
  const searchInput = document.getElementById('searchInput');
  if (searchInput) {
    searchInput.value = '';
  }

  // 3. Re-render all markers and update sidebar list
  renderMarkers(allRestaurants);
  updateVisibleSidebar(allRestaurants);

  // 4. Scroll sidebar list back to top
  const listContainer = document.getElementById('restaurantList');
  if (listContainer) {
    listContainer.scrollTop = 0;
  }
}

// Attach event listener to reset button
document.getElementById('resetMapBtn').addEventListener('click', resetMapView);

// ================================================================================================================================================================
// Mobile Bottom Sheet Drag & Touch Gesture Controller
// ================================================================================================================================================================
const sidebar = document.querySelector('.sidebar');
const sidebarHeader = document.querySelector('.sidebar-header');

let startY = 0;
let currentY = 0;
let isDragging = false;
let initialTransform = 0;

function isMobile() {
  return window.innerWidth <= 768;
}

// 1. Touch Start Handler
sidebarHeader.addEventListener('touchstart', (e) => {
  if (!isMobile()) return;
  isDragging = true;
  
  // Track start and current coordinates cleanly for this touch sequence
  startY = e.touches[0].clientY;
  currentY = startY;

  // Disable CSS transition during manual drag for instantaneous response
  sidebar.style.transition = 'none';

  const maxCollapse = sidebar.offsetHeight - 130;
  initialTransform = sidebar.classList.contains('collapsed') ? maxCollapse : 0;
}, { passive: true });

// 2. Touch Move Handler (Drag tracking)
window.addEventListener('touchmove', (e) => {
  if (!isDragging || !isMobile()) return;

  currentY = e.touches[0].clientY;
  const deltaY = currentY - startY;

  const maxCollapse = sidebar.offsetHeight - 130;
  let newTranslateY = initialTransform + deltaY;
  newTranslateY = Math.max(0, Math.min(newTranslateY, maxCollapse));

  sidebar.style.transform = `translateY(${newTranslateY}px)`;
}, { passive: true });

// 3. Touch End Handler (Snap Logic)
window.addEventListener('touchend', () => {
  if (!isDragging || !isMobile()) return;
  isDragging = false;

  // Re-enable smooth transition for snapping
  sidebar.style.transition = 'transform 0.3s cubic-bezier(0.25, 1, 0.5, 1)';

  const deltaY = currentY - startY;
  const maxCollapse = sidebar.offsetHeight - 130;
  const threshold = maxCollapse / 3;

  // Clear inline style so stylesheet classes (.collapsed) control state cleanly
  sidebar.style.transform = '';

  // Snap to collapsed or expanded state based on drag distance
  if (deltaY > threshold) {
    sidebar.classList.add('collapsed');
  } else if (deltaY < -threshold) {
    sidebar.classList.remove('collapsed');
  }
});

// 4. Click / Tap Toggle Handler
sidebarHeader.addEventListener('click', (e) => {
  if (!isMobile()) return;

  // If drag displacement was minimal (less than 10px total movement), treat as a tap
  if (Math.abs(currentY - startY) <= 10) {
    sidebar.style.transform = ''; // Clear inline styles
    sidebar.classList.toggle('collapsed');
    
    // Reset delta trackers after processing click
    startY = 0;
    currentY = 0;
  }
});

// run fetch on load
if (isMobile()) {
  sidebar.classList.add('collapsed');
}
fetchSheetData();

// Force Leaflet to recalculate dimensions once DOM and styles settle
window.addEventListener('load', () => {
  setTimeout(() => {
    map.invalidateSize();
  }, 200);
});

// Also invalidate size on window resize (e.g., orientation change)
window.addEventListener('resize', () => {
  if (window.innerWidth <= 768) {
    map.invalidateSize();
  }
});