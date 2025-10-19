package com.pcarchu.platepay.test;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.ui.Model;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;

@Slf4j
@RequiredArgsConstructor
@Controller
@RequestMapping(value = "/test")
public class OAuthTest {
    @Value("${OAUTH_REDIRECT_HOST}")
    private String host;

    @GetMapping("/kakao")
    public String kakao(Model model) {
        if (host.contains("localhost")) {
            model.addAttribute("host", host + ":8080");
        } else {
            model.addAttribute("host", host);
        }

        return "kakao/main";
    }

    @GetMapping("/success")
    public String success() {
        return "kakao/success";
    }

    @GetMapping("/ocr")
    public String ocr() { return "kakao/ocr"; }
}
