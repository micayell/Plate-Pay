package com.pcarchu.platepay.util;

import com.pcarchu.platepay.common.dto.email.EmailResponseDto;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Component;
import org.thymeleaf.context.Context;
import org.thymeleaf.spring6.SpringTemplateEngine;

import java.util.HashMap;
import java.util.Map;
import java.util.Random;

@Slf4j
@Component
@RequiredArgsConstructor
public class EmailUtil {
    private final JavaMailSender javaMailSender;
    private final SpringTemplateEngine templateEngine;

    public void sendMail(EmailResponseDto.EmailMessage emailMessageDto, String type) {
        HashMap<String, String> map = new HashMap<>();
        MimeMessage mimeMessage = javaMailSender.createMimeMessage();

        /*
        * 구현해야될 부분
        *
        * */

        try {
            MimeMessageHelper mimeMessageHelper = new MimeMessageHelper(mimeMessage, false, "UTF-8");
            mimeMessageHelper.setTo(emailMessageDto.getTo()); // 메일 수신자
            mimeMessageHelper.setSubject(emailMessageDto.getSubject()); // 메일 제목
            mimeMessageHelper.setText(setContext(map, type), true); // 메일 본문 내용, HTML 여부
            javaMailSender.send(mimeMessage);
        } catch (MessagingException e) {
            log.error("sendMail error occurred!");
        }
    }

    public String createCode() {
        Random random = new Random();
        StringBuffer key = new StringBuffer();

        for (int i = 0; i < 8; i++) {
            int index = random.nextInt(4);

            switch (index) {
                case 0: key.append((char) ((int) random.nextInt(26) + 97)); break; // 소문자 추가
                case 1: key.append((char) ((int) random.nextInt(26) + 65)); break; // 대문자 추가
                default: key.append(random.nextInt(9)); // 숫자 추가
            }
        }
        return key.toString();
    }

    // thymeleaf를 통한 html 적용
    public String setContext(HashMap<String, String> map, String type) {
        Context context = new Context();
        for (Map.Entry<String, String> entry : map.entrySet()) {
            context.setVariable(entry.getKey(), entry.getValue());
        }
        return templateEngine.process(type, context);
    }
}
