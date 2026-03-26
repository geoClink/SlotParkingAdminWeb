console.log('Slot Parking app loaded');
// View switching logic
function showView(view) {
	document.getElementById('owner-view').style.display = 'none';
	document.getElementById('attendant-view').style.display = 'none';
	document.getElementById('driver-view').style.display = 'none';
	document.getElementById(view + '-view').style.display = 'block';
}

// Basic data structures
const lots = [];
const users = [];

// Example: handle lot registration
document.addEventListener('DOMContentLoaded', () => {
	const ownerForm = document.getElementById('owner-form');
	const attendantLotsDiv = document.getElementById('attendant-lots');
	const lotListDiv = document.getElementById('lot-list');

	function renderAttendantLots() {
		attendantLotsDiv.innerHTML = '';
		lots.forEach((lot, idx) => {
			const lotDiv = document.createElement('div');
			lotDiv.className = 'lot-item';
			lotDiv.innerHTML = `
				<strong>${lot.name}</strong> (${lot.location})<br>
				Spots Remaining: <span id="spots-${idx}">${lot.spotsRemaining}</span><br>
				<button onclick="window.incrementSpot(${idx})">+</button>
				<button onclick="window.decrementSpot(${idx})">-</button>
			`;
			attendantLotsDiv.appendChild(lotDiv);
		});
	}

	function renderDriverLots() {
		lotListDiv.innerHTML = '';
		lots.forEach(lot => {
			const lotDiv = document.createElement('div');
			lotDiv.className = 'lot-item';
			lotDiv.innerHTML = `
				<strong>${lot.name}</strong> (${lot.location})<br>
				Spots Remaining: ${lot.spotsRemaining}<br>
				Price: $${lot.price}<br>
				Distance to Venue: ${lot.distance} mi
			`;
			lotListDiv.appendChild(lotDiv);
		});

	let map;
	function initMap() {
		// Center map on Detroit
		map = new google.maps.Map(document.getElementById('map'), {
			center: { lat: 42.3314, lng: -83.0458 },
			zoom: 13
		});
	}

	// Add markers for each lot (if lat/lng available)
	if (map) {
		lots.forEach(lot => {
			if (lot.lat && lot.lng) {
				new google.maps.Marker({
					position: { lat: lot.lat, lng: lot.lng },
					map,
					title: lot.name
				});
			}
		});
	}

	// Load map when driver view is shown
	window.showView = function(view) {
		document.getElementById('owner-view').style.display = 'none';
		document.getElementById('attendant-view').style.display = 'none';
		document.getElementById('driver-view').style.display = 'none';
		document.getElementById(view + '-view').style.display = 'block';
		if (view === 'attendant') renderAttendantLots();
		if (view === 'driver') {
			if (!map) initMap();
			renderDriverLots();
		}
	};
	}

	window.incrementSpot = function(idx) {
		if (lots[idx].spotsRemaining < lots[idx].totalSpots) {
			lots[idx].spotsRemaining++;
			document.getElementById(`spots-${idx}`).textContent = lots[idx].spotsRemaining;
		}
	};
	window.decrementSpot = function(idx) {
		if (lots[idx].spotsRemaining > 0) {
			lots[idx].spotsRemaining--;
			document.getElementById(`spots-${idx}`).textContent = lots[idx].spotsRemaining;
		}
	};

	if (ownerForm) {
		ownerForm.addEventListener('submit', function(e) {
			e.preventDefault();
			const inputs = ownerForm.querySelectorAll('input');
			const lot = {
				name: inputs[0].value,
				location: inputs[1].value,
				totalSpots: parseInt(inputs[2].value),
				price: parseFloat(inputs[3].value),
				distance: inputs[4].value,
				spotsRemaining: parseInt(inputs[2].value),
				attendant: false,
			};
			lots.push(lot);
			alert('Lot registered!');
			ownerForm.reset();
			renderAttendantLots();
			renderDriverLots();
		});
	}

	// Render lots when attendant or driver view is shown
	window.showView = function(view) {
		document.getElementById('owner-view').style.display = 'none';
		document.getElementById('attendant-view').style.display = 'none';
		document.getElementById('driver-view').style.display = 'none';
		document.getElementById(view + '-view').style.display = 'block';
		if (view === 'attendant') renderAttendantLots();
		if (view === 'driver') renderDriverLots();
	};
});
