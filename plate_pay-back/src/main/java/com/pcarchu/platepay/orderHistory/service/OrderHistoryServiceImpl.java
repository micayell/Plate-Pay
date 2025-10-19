package com.pcarchu.platepay.orderHistory.service;

import com.google.gson.JsonObject;
import com.pcarchu.platepay.account.domain.entity.Account;
import com.pcarchu.platepay.account.domain.repository.AccountRepository;
import com.pcarchu.platepay.car.domain.entity.Car;
import com.pcarchu.platepay.car.domain.repository.CarRepository;
import com.pcarchu.platepay.fcm.dto.FcmRequestDto;
import com.pcarchu.platepay.fcm.service.FcmService;
import com.pcarchu.platepay.inOutHistory.domain.entity.InOutHistory;
import com.pcarchu.platepay.inOutHistory.domain.repository.InOutHistoryRepository;
import com.pcarchu.platepay.member.domain.entity.Member;
import com.pcarchu.platepay.orderHistory.domain.entity.OrderHistory;
import com.pcarchu.platepay.orderHistory.domain.repository.OrderHistoryRepository;
import com.pcarchu.platepay.orderHistory.dto.OrderHistoryRequestDto;
import com.pcarchu.platepay.orderHistory.dto.OrderHistoryResponseDto;
import com.pcarchu.platepay.store.domain.entity.Store;
import com.pcarchu.platepay.store.domain.repository.StoreRepository;
import com.pcarchu.platepay.token.domain.entity.RefreshToken;
import com.pcarchu.platepay.token.domain.repository.RefreshTokenRepository;
import com.pcarchu.platepay.util.SsafyUtil;

import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.TreeMap;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class OrderHistoryServiceImpl implements OrderHistoryService{

    private final FcmService fcmService;

    private final OrderHistoryRepository orderHistoryRepository;
    private final InOutHistoryRepository inOutHistoryRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final StoreRepository storeRepository;
    private final CarRepository carRepository;
    private final AccountRepository accountRepository;

    private final SsafyUtil ssafyUtil;

    @Override
    @Transactional
    public void addOrderHistory(OrderHistoryRequestDto.AddOrderHistoryRequestDto requestDto) {

        // 차량 조회
        Car car = carRepository.findByPlateNum(requestDto.getPlateNum())
                .orElseThrow(() -> new IllegalArgumentException("등록되지 않은 차량입니다."));

        // 차량 소유주(Member)
        Member owner = car.getMember();

        RefreshToken rtk = refreshTokenRepository.findByEmail(car.getMember().getEmail()).orElseThrow(
                () -> new RuntimeException("access token을 찾을 수 없습니다.")
        );

        // 주차 내역 확인 (아직 출차하지 않은 경우)
        InOutHistory inOutHistory = inOutHistoryRepository
                .findByCarAndOutTimeIsNull(car)
                .orElseThrow(() -> new IllegalArgumentException("해당 차량은 현재 주차 중이 아닙니다."));

        // 매장 확인
        Store store = null;
        if (requestDto.getStoreId() != null) {
            store = storeRepository.findById(requestDto.getStoreId())
                    .orElseThrow(() -> new IllegalArgumentException("해당 매장이 존재하지 않습니다."));
        }

        // 차량 소유주의 주 계좌 조회
        Account mainAccount = accountRepository.findByMember_MemberUidAndIsMainTrueAndStatusIsTrue(owner.getMemberUid())
                .orElseThrow(() -> new IllegalArgumentException("주 계좌가 설정되어 있지 않습니다."));

        // 계좌 잔액 조회 (토큰, userKey 불필요)
        JsonObject balanceRec = ssafyUtil.inquireAccountBalance(owner.getUserKey(), mainAccount.getAccountNo());
        if (balanceRec == null) {
            throw new IllegalArgumentException("계좌 잔액 정보를 불러오지 못했습니다.");
        }
        long accountBalance = balanceRec.get("accountBalance").getAsLong();

        // 미납 금액 합산
        Long unpaidCostSum = orderHistoryRepository
                .sumCostByInOutHistory_InOutHistoryUidAndIsPaidFalse(inOutHistory.getInOutHistoryUid())
                .orElse(0L);

        long totalCost = unpaidCostSum + requestDto.getCost();

        if (totalCost > accountBalance) {
            throw new IllegalArgumentException("계좌 잔액이 부족합니다.");
        }

        // 주문 내역 저장
        OrderHistory orderHistory = OrderHistory.builder()
                .store(store)
                .inOutHistory(inOutHistory)
                .cost(requestDto.getCost())
                .isPaid(false)
                .build();

        if (store == null) { // 주차비 결제
            orderHistory.changeIsPaid(true);
        }

        orderHistoryRepository.save(orderHistory);

        // 이벤트 발송
        if (store != null) {
            FcmRequestDto.SendNoti sendNoti = FcmRequestDto.SendNoti.builder()
                    .token(rtk.getFcmToken())
                    .title("주문 완료")
                    .body(store.getStoreName() + "에서 " + orderHistory.getCost() + "원을 주문하셨습니다.")
                    .build();

            fcmService.sendMessage(sendNoti);
        }

        log.info("주문 내역 저장 완료: storeId={}, car={}, cost={}",
                requestDto.getStoreId(), requestDto.getPlateNum(), requestDto.getCost());
    }


    @Transactional(readOnly = true)
    public List<OrderHistoryResponseDto.PaymentHistoryInfo> getRecentPaymentHistories(Member loginMember) {LocalDateTime oneWeekAgo = LocalDateTime.now().minusDays(7);

        List<InOutHistory> histories = orderHistoryRepository.findRecentInOutHistories(loginMember.getMemberUid(), oneWeekAgo);

        return histories.stream()
                .map(inOut -> {
                    List<OrderHistoryResponseDto.OrderHistoryInfo> orders = inOut.getOrderHistories().stream()
                            .map(order -> OrderHistoryResponseDto.OrderHistoryInfo.builder()
                                    .orderHistoryId(order.getOrderHistoryUid())
                                    .storeName(order.getStore().getStoreName())
                                    .cost(order.getCost())
                                    .isPaid(order.getIsPaid())
                                    .build())
                            .toList();

                    // 총 비용 합계
                    int totalCost = orders.stream().mapToInt(OrderHistoryResponseDto.OrderHistoryInfo::getCost).sum();

                    return OrderHistoryResponseDto.PaymentHistoryInfo.builder()
                            .inOutHistoryId(inOut.getInOutHistoryUid())
                            .parkingLotUid(inOut.getParkingLot().getParkingLotUid())
                            .parkingLotName(inOut.getParkingLot().getParkingLotName())
                            .address(inOut.getParkingLot().getAddress())
                            .plateNum(inOut.getCar().getPlateNum())
                            .bankName(inOut.getAccount().getBank().getBankName())
                            .accountNo(inOut.getAccount().getAccountNo())
                            .outTime(inOut.getOutTime())
                            .orders(orders)
                            .totalCost(totalCost)
                            .build();
                })
                .toList();
    }

    @Transactional(readOnly = true)
    public Map<LocalDate, List<OrderHistoryResponseDto.PaymentHistoryInfo>>
    getMonthlyPaymentHistories(Member loginMember, int year, int month) {

        LocalDateTime startDate = LocalDate.of(year, month, 1).atStartOfDay();
        LocalDateTime endDate = startDate.plusMonths(1).minusNanos(1);

        List<InOutHistory> histories = orderHistoryRepository
                .findMonthlyInOutHistories(loginMember.getMemberUid(), startDate, endDate);

        List<OrderHistoryResponseDto.PaymentHistoryInfo> infos = histories.stream()
                .map(inOut -> {
                    List<OrderHistoryResponseDto.OrderHistoryInfo> orders = inOut.getOrderHistories().stream()
                            .map(order -> OrderHistoryResponseDto.OrderHistoryInfo.builder()
                                    .orderHistoryId(order.getOrderHistoryUid())
                                    .storeName(order.getStore().getStoreName())
                                    .cost(order.getCost())
                                    .isPaid(order.getIsPaid())
                                    .build())
                            .toList();

                    int totalCost = orders.stream()
                            .mapToInt(OrderHistoryResponseDto.OrderHistoryInfo::getCost)
                            .sum();

                    return OrderHistoryResponseDto.PaymentHistoryInfo.builder()
                            .inOutHistoryId(inOut.getInOutHistoryUid())
                            .parkingLotUid(inOut.getParkingLot().getParkingLotUid())
                            .parkingLotName(inOut.getParkingLot().getParkingLotName())
                            .address(inOut.getParkingLot().getAddress())
                            .plateNum(inOut.getCar().getPlateNum())
                            .bankName(inOut.getAccount().getBank().getBankName())
                            .accountNo(inOut.getAccount().getAccountNo())
                            .outTime(inOut.getOutTime())
                            .orders(orders)
                            .totalCost(totalCost)
                            .build();
                })
                .toList();

        return infos.stream()
                .collect(Collectors.groupingBy(
                        info -> info.getOutTime().toLocalDate(),
                        () -> new TreeMap<>(), // Supplier 로 TreeMap 지정
                        Collectors.toList()
                ));
    }

    @Transactional(readOnly = true)
    public OrderHistoryResponseDto.PaymentHistoryInfo getActiveUnpaidHistory(Member member) {

        List<Car> cars = carRepository.findByMemberId(member.getMemberUid());

        InOutHistory inOutHistory = cars.stream()
                .map(Car::getPlateNum)
                .map(plateNum -> orderHistoryRepository.findActiveInOutHistoryWithUnpaidOrders(plateNum))
                .filter(Optional::isPresent)
                .map(Optional::get)
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("현재 주차 중인 내역이 없습니다."));

        List<OrderHistoryResponseDto.OrderHistoryInfo> orders = inOutHistory.getOrderHistories().stream()
                .filter(o -> !o.getIsPaid())
                .map(order -> OrderHistoryResponseDto.OrderHistoryInfo.builder()
                        .orderHistoryId(order.getOrderHistoryUid())
                        .storeName(order.getStore().getStoreName())
                        .cost(order.getCost())
                        .isPaid(order.getIsPaid())
                        .build())
                .toList();

        int totalCost = orders.stream()
                .mapToInt(OrderHistoryResponseDto.OrderHistoryInfo::getCost)
                .sum();

        return OrderHistoryResponseDto.PaymentHistoryInfo.builder()
                .inOutHistoryId(inOutHistory.getInOutHistoryUid())
                .parkingLotUid(inOutHistory.getParkingLot().getParkingLotUid())
                .parkingLotName(inOutHistory.getParkingLot().getParkingLotName())
                .address(inOutHistory.getParkingLot().getAddress())
                .plateNum(inOutHistory.getCar().getPlateNum())
                .bankName(inOutHistory.getAccount().getBank().getBankName())
                .accountNo(inOutHistory.getAccount().getAccountNo())
                .outTime(inOutHistory.getOutTime())
                .orders(orders)
                .totalCost(totalCost)
                .carModel(inOutHistory.getCar().getCarModel())
                .build();
    }
}
