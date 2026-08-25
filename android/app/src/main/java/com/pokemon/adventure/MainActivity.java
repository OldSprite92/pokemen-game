package com.pokemon.adventure;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(MultiplayerServerPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
