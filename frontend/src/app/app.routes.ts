import { Routes } from '@angular/router';
import { Login } from './login/login';
import { Inventory } from './inventory/inventory';
import { Reports } from './reports/reports';

export const routes: Routes = [
	{
		path: '',
		pathMatch: 'full',
		redirectTo: 'login'
	},
	{
		path: 'login',
		component: Login
	},
	{
		path: 'inventory',
		component: Inventory
	},
	{
		path: 'reports',
		component: Reports
	},
	{
		path: '**',
		redirectTo: 'login'
	}
];
