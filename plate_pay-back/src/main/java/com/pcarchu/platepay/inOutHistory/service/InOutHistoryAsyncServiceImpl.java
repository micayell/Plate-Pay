package com.pcarchu.platepay.inOutHistory.service;

import com.google.gson.JsonObject;
import com.pcarchu.platepay.account.domain.entity.Account;
import com.pcarchu.platepay.car.domain.entity.Car;
import com.pcarchu.platepay.car.service.CarService;
import com.pcarchu.platepay.fcm.dto.FcmRequestDto;
import com.pcarchu.platepay.fcm.service.FcmService;
import com.pcarchu.platepay.inOutHistory.domain.entity.InOutHistory;
import com.pcarchu.platepay.inOutHistory.domain.repository.InOutHistoryRepository;
import com.pcarchu.platepay.orderHistory.domain.entity.OrderHistory;
import com.pcarchu.platepay.orderHistory.dto.OrderHistoryRequestDto;
import com.pcarchu.platepay.orderHistory.service.OrderHistoryService;
import com.pcarchu.platepay.parkingLot.domain.entity.ParkingLot;
import com.pcarchu.platepay.parkingLot.service.ParkingLotService;
import com.pcarchu.platepay.token.domain.entity.RefreshToken;
import com.pcarchu.platepay.token.domain.repository.RefreshTokenRepository;
import com.pcarchu.platepay.util.SsafyUtil;
import com.pcarchu.platepay.util.SseUtil;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.CompletableFuture;

@Slf4j
@Service
@RequiredArgsConstructor
public class InOutHistoryAsyncServiceImpl implements InOutHistoryAsyncService {
    private final CarService carService;
    private final ParkingLotService parkingLotService;
    private final FcmService fcmService;

    private final InOutHistoryRepository inOutHistoryRepository;
    private final RefreshTokenRepository refreshTokenRepository;

    private final SsafyUtil ssafyUtil;
    private final SseUtil sseUtil;
    private final OrderHistoryService orderHistoryService;

    @Override
    @Async("ioExecutor")
    @Transactional
    public CompletableFuture<Void> finalizeEnter(Long parkingLotId, Map<String, Object> res) {
        log.info("finalizeEnter() thread={}", Thread.currentThread().getName());

        // 로직 처리
        ParkingLot parkingLot = parkingLotService.getParkingLotById(parkingLotId).orElseThrow(
                () -> new RuntimeException("해당 주차장이 존재하지 없습니다.")
        );

        if (res == null || (res != null && !res.containsKey("plate_number"))) {
            throw new RuntimeException("자동차 번호판 사진 인식에 실패했습니다.");
        }

        String plateNo = (String) res.get("plate_number");
        Car car = carService.getCarByPlateNum(plateNo).orElseThrow(
                () -> new RuntimeException("자동차가 존재하지 않습니다.")
        );

        RefreshToken rtk = refreshTokenRepository.findByEmail(car.getMember().getEmail()).orElseThrow(
                () -> new RuntimeException("access token을 찾을 수 없습니다.")
        );

        Account account = car.getMember().getAccounts().stream()
                .filter(Account::getIsMain)
                .findFirst()
                .orElseThrow(() -> new IllegalStateException("메인 계좌 없음"));

        // 입차 등록
        Optional<InOutHistory> optionalInOutHistory = inOutHistoryRepository.findByCarAndOutTimeIsNull(car).stream().findFirst();

        if (optionalInOutHistory.isEmpty()) {
            inOutHistoryRepository.save(InOutHistory.builder()
                    .parkingLot(parkingLot)
                    .car(car)
                    .account(account)
                    .inTime(LocalDateTime.now())
                    .build());
        }

        // 이벤트 발송
        FcmRequestDto.SendNoti sendNoti = FcmRequestDto.SendNoti.builder()
                .token(rtk.getFcmToken())
                .title("입차 완료")
                .body(parkingLot.getParkingLotName() + "에 입차하셨습니다!")
                .build();

        fcmService.sendMessage(sendNoti);

        return CompletableFuture.completedFuture(null);
    }

    @Override
    @Async("ioExecutor")
    @Transactional
    public CompletableFuture<Void> finalizeExit(Long parkingLotId, Map<String, Object> res) {
        log.info("finalizeExit() thread={}", Thread.currentThread().getName());

        // 로직 처리
        ParkingLot parkingLot = parkingLotService.getParkingLotById(parkingLotId).orElseThrow(
                () -> new RuntimeException("해당 주차장이 존재하지 없습니다.")
        );

        if (res == null || (res != null && !res.containsKey("plate_number"))) {
            throw new RuntimeException("자동차 번호판 사진 인식에 실패했습니다.");
        }

        String plateNo = (String) res.get("plate_number");
        Car car = carService.getCarByPlateNum(plateNo).orElseThrow(
                () -> new RuntimeException("자동차가 존재하지 않습니다.")
        );

        RefreshToken rtk = refreshTokenRepository.findByEmail(car.getMember().getEmail()).orElseThrow(
                () -> new RuntimeException("access token을 찾을 수 없습니다.")
        );

        // 현재 입출차 내역 fetch
        InOutHistory inOutHistory = inOutHistoryRepository.findFirstByCarAndParkingLotAndOutTimeIsNull(car, parkingLot).orElseThrow(
                () -> new RuntimeException("입출차 내역이 존재하지 않습니다.")
        );

        // 최종 결제
        // todo querydsl로 최적화하기
        int totalOrderCost = inOutHistory.getOrderHistories().stream()
                .mapToInt(OrderHistory::getCost)
                .sum();

        inOutHistory.getOrderHistories().stream().forEach(orderHistory -> {
            String storeName = orderHistory.getStore().getStoreName();
            JsonObject rec = ssafyUtil.updateDemandDepositAccountWithdrawal(car.getMember().getUserKey(), inOutHistory.getAccount().getAccountNo(), orderHistory.getCost(), storeName);

            if (rec == null) { // 결제 실패
                // todo 결제 실패시 보상 로직 구현

            } else {
                orderHistory.changeIsPaid(true);
            }
        });

        // 주차장 비용 정산
        LocalDateTime inTime = inOutHistory.getInTime();
        LocalDateTime outTime = LocalDateTime.now();

        // 분 단위 경과시간
        long minutes = Duration.between(inTime, outTime).toMinutes();
        int payCnt = (int) Math.floor(minutes / 30L);

        int totalCost = parkingLot.getParkingLotFee().getPrimaryFee() + payCnt * parkingLot.getParkingLotFee().getAdditionalFee();

        // todo fetch join으로 최적화
        JsonObject rec = ssafyUtil.updateDemandDepositAccountWithdrawal(car.getMember().getUserKey(), inOutHistory.getAccount().getAccountNo(), totalCost, parkingLot.getParkingLotName());

        // todo 주차비 결제 실패시 보상 로직 구현
        if (rec == null) { // 결제 실패

        } else {
            // 주차비 정보 업데이트
            orderHistoryService.addOrderHistory(OrderHistoryRequestDto.AddOrderHistoryRequestDto.builder()
                            .storeId(1000L)
                            .plateNum(plateNo)
                            .cost(totalCost)
                            .build());
        }

        // 출차 표시
        inOutHistory.changeOutTime(outTime);

        // 이벤트 발송
        FcmRequestDto.SendNoti sendNoti = FcmRequestDto.SendNoti.builder()
                .token(rtk.getFcmToken())
                .title("출차 결제 완료")
                .body(parkingLot.getParkingLotName() + "에서 " + (totalOrderCost + totalCost) + "원 결제되었습니다.")
                .build();

        fcmService.sendMessage(sendNoti);

        return CompletableFuture.completedFuture(null);
    }
}
