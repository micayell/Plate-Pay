package com.yolo.bringit.pcarchubank.controller;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;

@Slf4j
@Controller
@RequestMapping("/auths")
@RequiredArgsConstructor
public class AuthController {

    @GetMapping("/login")
    public String login() {
        return "auth/login";
    }

}
