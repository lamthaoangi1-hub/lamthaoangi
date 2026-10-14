import { startPortal } from './panel.js?v=20261014i';
import { panel as admin } from './admin.js?v=20261014i';
import { panel as seller } from './seller.js?v=20261014i';
import { panel as shipper } from './shipper.js?v=20261014i';

startPortal([admin, seller, shipper]);
