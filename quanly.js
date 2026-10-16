import { startPortal } from './panel.js?v=20261016a';
import { panel as admin } from './admin.js?v=20261016a';
import { panel as seller } from './seller.js?v=20261016a';
import { panel as shipper } from './shipper.js?v=20261016a';

startPortal([admin, seller, shipper]);
