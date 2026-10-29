import { startPortal } from './panel.js?v=20261029d';
import { panel as admin } from './admin.js?v=20261029d';
import { panel as seller } from './seller.js?v=20261029d';
import { panel as shipper } from './shipper.js?v=20261029d';

startPortal([admin, seller, shipper]);
