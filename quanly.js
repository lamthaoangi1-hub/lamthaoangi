import { startPortal } from './panel.js?v=20261104a';
import { panel as admin } from './admin.js?v=20261104a';
import { panel as seller } from './seller.js?v=20261104a';
import { panel as shipper } from './shipper.js?v=20261103d';

startPortal([admin, seller, shipper]);
