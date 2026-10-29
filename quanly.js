import { startPortal } from './panel.js?v=20261029c';
import { panel as admin } from './admin.js?v=20261029c';
import { panel as seller } from './seller.js?v=20261029c';
import { panel as shipper } from './shipper.js?v=20261029c';

startPortal([admin, seller, shipper]);
