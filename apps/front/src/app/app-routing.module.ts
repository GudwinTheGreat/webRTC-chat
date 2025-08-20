import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { HomeComponent } from './home/home.component';
import { CallRoomComponent } from './call-room/call-room.component';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: ':id', component: CallRoomComponent },
  { path: '**', redirectTo: '' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }