import { Routes } from '@angular/router';
import { Login } from './login/login';
import { Inventory } from './inventory/inventory';
import { Reports } from './reports/reports';
import { authGuard, guestGuard } from './auth.guard';

export const routes: Routes = [
	{
		path: '',
		pathMatch: 'full',
		redirectTo: 'login'
	},
	{
		path: 'mainpage',
		redirectTo: 'inventory'
	},
	{
		path: 'login',
		canActivate: [guestGuard],
		component: Login
	},
	{
		path: 'inventory',
		canActivate: [authGuard],
		component: Inventory
	},
	{
		path: 'reports',
		canActivate: [authGuard],
		component: Reports
	},
	{
		path: '**',
		redirectTo: 'login'
	}
];
