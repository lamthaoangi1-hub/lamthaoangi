import { startPortal } from './panel.js?v=20261109b';
import { panel as admin } from './admin.js?v=20261109c';
import { panel as seller } from './seller.js?v=20261109b';
import { panel as shipper } from './shipper.js?v=20261109b';

startPortal([admin, seller, shipper]);
