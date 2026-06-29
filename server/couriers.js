/**
 * Courier Logistics API Connectors
 * Simulates real-world API requests to Sri Lankan and International couriers.
 */

// Simulated API credentials database check / default configuration
const COURIER_CONFIGS = {
  'Sri Lanka Post': { endpoint: 'http://www.slpost.gov.lk/api/v1/track', format: 'xml' },
  'Citypak (Hayleys)': { endpoint: 'https://api.citypak.lk/v1/track', format: 'json' },
  'Aramex': { endpoint: 'https://ws.aramex.net/ShippingAPI.V2/Tracking/Service_1_0.svc/json/TrackShipments', format: 'json' },
  'DHL Express': { endpoint: 'https://api-eu.dhl.com/track/shipments', format: 'json' },
  'FedEx': { endpoint: 'https://ws.fedex.com:443/web-services/track', format: 'xml' },
  'Pronto': { endpoint: 'https://api.prontolk.com/track.php', format: 'json' }
};

/**
 * Triggers a simulated external API call to the specified courier tracking system.
 * Parsers return actual structured checkpoint history logs.
 */
export async function queryCourierAPI(courier, trackingNumber) {
  const config = COURIER_CONFIGS[courier] || { endpoint: '', format: 'json' };
  
  console.log(`[Courier API] Initiating request to ${courier} API endpoint: ${config.endpoint} for tracking: ${trackingNumber}`);
  
  // Simulate network latency
  await new Promise(resolve => setTimeout(resolve, 800));

  const now = new Date();
  const formatTime = (daysAgo, hoursOffset) => {
    return new Date(now.getTime() - (daysAgo * 24 * 60 * 60 * 1000) + (hoursOffset * 60 * 60 * 1000)).toISOString();
  };

  // Generate structured responses simulating actual parsed return elements of each API schema
  switch (courier) {
    case 'Sri Lanka Post':
      // SL Post EMS XML SOAP format parsed response
      return [
        { status: 'Manifest Registered', details: 'SLPOST Electronic Shipping Info Received.', location: 'Colombo Central Mail Exchange (CME)', time: formatTime(3, 2) },
        { status: 'In Transit', details: 'Item forwarded to sorting department.', location: 'CME Sorting Hub', time: formatTime(2, 4) },
        { status: 'Received at Office', details: 'Parcel received at destination post office.', location: 'Kandy Post Office (20000)', time: formatTime(1, 10) },
        { status: 'Out for Delivery', details: 'Postman assigned for local delivery.', location: 'Kandy Ward Street', time: formatTime(0, 3) }
      ];

    case 'Citypak (Hayleys)':
      // Citypak REST JSON status array response
      return [
        { status: 'Pickup Scheduled', details: 'Citypak pickup agent requested.', location: 'Seller Warehouse', time: formatTime(2, 1) },
        { status: 'Manifested', details: 'Package processed at main city hub.', location: 'Hayleys Citypak Terminal - Colombo 10', time: formatTime(1, 6) },
        { status: 'Transit', details: 'Shipment dispatched in vehicle transit.', location: 'Galle Hub Terminal', time: formatTime(1, 14) },
        { status: 'Out for Delivery', details: 'Deliverer en route to recipient.', location: 'Galle City Delivery Line', time: formatTime(0, 5) }
      ];

    case 'Aramex':
      // Aramex Web Service JSON tracking results
      return [
        { status: 'Record Created', details: 'Shipment description received.', location: 'Colombo Hub Office', time: formatTime(3, 0) },
        { status: 'Departed Operations', details: 'Aramex parcel left origin branch.', location: 'Colombo Operations Hub', time: formatTime(2, 8) },
        { status: 'Received at Operations', details: 'Parcel scanned at local depot.', location: 'Negombo Delivery Center', time: formatTime(1, 11) },
        { status: 'Out for Delivery', details: 'Out with delivery courier.', location: 'Negombo Sector C', time: formatTime(0, 4) }
      ];

    case 'DHL Express':
      // DHL REST Tracking API response
      return [
        { status: 'Shipment Picked Up', details: 'DHL courier picked up the package.', location: 'Colombo Station', time: formatTime(2, 2) },
        { status: 'Processed at Hub', details: 'Processed at Colombo facility.', location: 'Colombo Gateway', time: formatTime(1, 5) },
        { status: 'Arrived at Delivery Facility', details: 'Scanned at delivery station.', location: 'Jaffna Hub', time: formatTime(0, 8) },
        { status: 'Out for Delivery', details: 'Courier out with shipment.', location: 'Jaffna Sector 2', time: formatTime(0, 11) }
      ];

    case 'FedEx':
      // FedEx Tracking SOAP Web Service XML response
      return [
        { status: 'Shipment information sent to FedEx', details: 'Manifest generated.', location: 'Origin Facility', time: formatTime(4, 1) },
        { status: 'Picked Up', details: 'Package received by FedEx logistics.', location: 'Colombo FedEx Hub', time: formatTime(3, 7) },
        { status: 'In Transit', details: 'Package dispatched for gateway.', location: 'Katunayake Airport Facility', time: formatTime(2, 12) },
        { status: 'At Destination Facility', details: 'Sorted and ready for local dispatch.', location: 'Matara Terminal', time: formatTime(1, 15) }
      ];

    case 'Pronto':
      // Pronto LK tracking API response
      return [
        { status: 'Shipment Received', details: 'Pronto courier accepted package.', location: 'Colombo Booking Hub', time: formatTime(2, 3) },
        { status: 'Sorting Facility', details: 'Parcel scanned at main sorting line.', location: 'Pronto Central Sorting Hub', time: formatTime(1, 9) },
        { status: 'Dispatched to Branch', details: 'Dispatched for local branch delivery.', location: 'Kurunegala Pronto Office', time: formatTime(0, 2) },
        { status: 'Out for Delivery', details: 'Out with Pronto delivery agent.', location: 'Kurunegala Area', time: formatTime(0, 6) }
      ];

    default:
      return [
        { status: 'Manifest Created', details: 'Shipping manifest processed.', location: 'Origin Warehouse', time: formatTime(1, 0) }
      ];
  }
}
