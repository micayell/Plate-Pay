package com.yolo.bringit.pcarchubank.controller;

import com.yolo.bringit.pcarchubank.dto.member.MemberResponseDto;
import com.yolo.bringit.pcarchubank.service.BankService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;

@Controller
@RequestMapping("/banks")
@RequiredArgsConstructor
public class BankController {

    private final BankService bankService;

    @GetMapping("/accounts")
    public String viewAccounts(@AuthenticationPrincipal MemberResponseDto.MemberInfo loginMember, Model model) {
        model.addAttribute("accounts", bankService.getAccounts(loginMember.getUserKey()));
        model.addAttribute("memberName", loginMember.getName());
        return "bank/accounts"; // templates/bank/accounts.html
    }

    @GetMapping("/histories/{accountNo}")
    public String viewHistories(@AuthenticationPrincipal MemberResponseDto.MemberInfo loginMember,
                                @PathVariable String accountNo,
                                Model model) {
        model.addAttribute("histories", bankService.getHistories(loginMember.getUserKey(), accountNo));
        model.addAttribute("memberName", loginMember.getName());
        return "bank/histories"; // templates/bank/histories.html
    }

    @GetMapping("/create")
    public String viewCreate() {
        return "bank/create"; // templates/bank/create.html
    }

    @PostMapping("/create")
    public String createAccount(@AuthenticationPrincipal MemberResponseDto.MemberInfo loginMember) {
        bankService.createAccount(loginMember.getUserKey());
        return "redirect:/banks/accounts";
    }
}
