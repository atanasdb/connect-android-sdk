package com.telenor.connect.connectidexample;

import android.app.Application;
import android.os.StrictMode;

import com.telenor.connect.ConnectSdk;

public class ExampleApplication extends Application {
    @Override
    public void onCreate() {
        super.onCreate();
        ConnectSdk.sdkInitialize(getApplicationContext());

        StrictMode.ThreadPolicy policy = new StrictMode.ThreadPolicy.Builder()
                .permitAll().build();
        StrictMode.setThreadPolicy(policy);
    }
}
