<?php

use Illuminate\Support\Facades\Schedule;

// Schedulers will be scheduled here or in commands
Schedule::command('order:auto-complete-delivered')->everyTenMinutes();
Schedule::command('order:reject-overdue-cancellations')->everyFiveMinutes();
Schedule::command('order:dispatch-outbox')->everyMinute();
Schedule::command('order:reconcile-expiries')->everyTenMinutes();
