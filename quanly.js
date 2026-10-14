import { startPortal } from './panel.js?v=20261014g';
import { panel as admin } from './admin.js?v=20261014g';
import { panel as seller } from './seller.js?v=20261014g';
import { panel as shipper } from './shipper.js?v=20261014g';

startPortal([admin, seller, shipper]);
