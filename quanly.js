import { startPortal } from './panel.js?v=20261014e';
import { panel as admin } from './admin.js?v=20261014e';
import { panel as seller } from './seller.js?v=20261014e';
import { panel as shipper } from './shipper.js?v=20261014e';

startPortal([admin, seller, shipper]);
