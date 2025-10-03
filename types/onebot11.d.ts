// OneBot11 协议类型定义，该文件由AI生成，未经过检查

declare namespace OneBot11 {

    // 基础事件接口
    export interface Event {
        time: number;           // 事件发生的时间戳
        self_id: number;        // 收到事件的机器人 QQ 号
        post_type: string;      // 事件类型
    }

    // 消息事件基础接口
    export interface BaseMessageEvent extends Event {
        post_type: 'message';
        message_type: string;   // 消息类型
        sub_type: string;       // 消息子类型
        message_id: number;     // 消息 ID
        user_id: number;        // 发送者 QQ 号
        message: Message[] | string;  // 消息内容
        raw_message: string;    // 原始消息内容
        font: number;           // 字体
    }

    // 私聊消息事件
    export interface PrivateMessageEvent extends BaseMessageEvent {
        message_type: 'private';
        sender: {
            user_id: number;
            nickname: string;
            sex?: 'male' | 'female' | 'unknown';
            age?: number;
        };
    }

    // 群聊消息事件
    export interface GroupMessageEvent extends BaseMessageEvent {
        message_type: 'group';
        group_id: number;       // 群号
        sender: {
            user_id: number;
            nickname: string;
            card?: string;        // 群名片
            role?: 'owner' | 'admin' | 'member';
            title?: string;       // 专属头衔
        };
        anonymous: Anonymous | null;  // 匿名信息
    }

    // 匿名信息接口
    export interface Anonymous {
        id: number;
        name: string;
        flag: string;
    }

    // 通知事件基础接口
    export interface BaseNoticeEvent extends Event {
        post_type: 'notice';
        notice_type: string;
    }

    // 群文件上传
    export interface GroupUploadNoticeEvent extends BaseNoticeEvent {
        notice_type: 'group_upload';
        group_id: number;
        user_id: number;
        file: {
            id: string;
            name: string;
            size: number;
            busid: number;
        };
    }

    // 群管理员变动
    export interface GroupAdminNoticeEvent extends BaseNoticeEvent {
        notice_type: 'group_admin';
        sub_type: 'set' | 'unset';
        group_id: number;
        user_id: number;
    }

    // 群成员减少
    export interface GroupDecreaseNoticeEvent extends BaseNoticeEvent {
        notice_type: 'group_decrease';
        sub_type: 'leave' | 'kick' | 'kick_me';
        group_id: number;
        operator_id: number;
        user_id: number;
    }

    // 群成员增加
    export interface GroupIncreaseNoticeEvent extends BaseNoticeEvent {
        notice_type: 'group_increase';
        sub_type: 'approve' | 'invite';
        group_id: number;
        operator_id: number;
        user_id: number;
    }

    // 群禁言
    export interface GroupBanNoticeEvent extends BaseNoticeEvent {
        notice_type: 'group_ban';
        sub_type: 'ban' | 'lift_ban';
        group_id: number;
        operator_id: number;
        user_id: number;
        duration: number;
    }

    // 好友添加
    export interface FriendAddNoticeEvent extends BaseNoticeEvent {
        notice_type: 'friend_add';
        user_id: number;
    }

    // 群消息撤回
    export interface GroupRecallNoticeEvent extends BaseNoticeEvent {
        notice_type: 'group_recall';
        group_id: number;
        user_id: number;          // 消息发送者ID
        operator_id: number;      // 操作者ID
        message_id: number;       // 被撤回的消息ID
    }

    // 好友消息撤回  
    export interface FriendRecallNoticeEvent extends BaseNoticeEvent {
        notice_type: 'friend_recall';
        user_id: number;          // 好友ID
        message_id: number;       // 被撤回的消息ID
    }

    // 通知类事件（notify）
    export interface NotifyNoticeEvent extends BaseNoticeEvent {
        notice_type: 'notify';
        sub_type: string;         // 通知子类型
        user_id: number;          // 触发者ID
    }

    // 戳一戳通知
    export interface PokeNotifyEvent extends NotifyNoticeEvent {
        sub_type: 'poke';
        target_id: number;        // 被戳用户ID
        group_id?: number;        // 群号（如果是群内戳一戳）
    }

    // 群红包运气王通知
    export interface LuckyKingNotifyEvent extends NotifyNoticeEvent {
        sub_type: 'lucky_king';
        target_id: number;        // 运气王ID
        group_id: number;         // 群号
    }

    // 群荣誉变更通知
    export interface HonorNotifyEvent extends NotifyNoticeEvent {
        sub_type: 'honor';
        honor_type: string;       // 荣誉类型，如'talkative'、'performer'等
        group_id: number;         // 群号
    }

    // 请求事件基础接口
    export interface BaseRequestEvent extends Event {
        post_type: 'request';
        request_type: string;
    }

    // 好友请求
    export interface FriendRequestEvent extends BaseRequestEvent {
        request_type: 'friend';
        user_id: number;
        comment: string;
        flag: string;
    }

    // 群请求
    export interface GroupRequestEvent extends BaseRequestEvent {
        request_type: 'group';
        sub_type: 'add' | 'invite';
        group_id: number;
        user_id: number;
        comment: string;
        flag: string;
    }

    // 元事件基础接口
    export interface BaseMetaEvent extends Event {
        post_type: 'meta_event';
        meta_event_type: string;
    }

    // 生命周期事件
    export interface LifecycleMetaEvent extends BaseMetaEvent {
        meta_event_type: 'lifecycle';
        sub_type: 'enable' | 'disable' | 'connect';
    }

    // 心跳事件
    export interface HeartbeatMetaEvent extends BaseMetaEvent {
        meta_event_type: 'heartbeat';
        status: {
            app_initialized: boolean;
            app_enabled: boolean;
            plugins_good: boolean;
            app_good: boolean;
            online: boolean;
            stat: {
                packet_received: number;
                packet_sent: number;
                packet_lost: number;
                message_received: number;
                message_sent: number;
                disconnect_times: number;
                lost_times: number;
                last_message_time: number;
            };
        };
        interval: number;
    }

    // 消息段接口
    export interface Message {
        type: string;
        data: Record<string, any>;
    }

    // 特定消息段类型
    export interface TextMessage extends Message {
        type: 'text';
        data: {
            text: string;
        };
    }

    export interface ImageMessage extends Message {
        type: 'image';
        data: {
            file: string;
            url?: string;
        };
    }

    export interface FaceMessage extends Message {
        type: 'face';
        data: {
            id: string;
        };
    }

    export interface AtMessage extends Message {
        type: 'at';
        data: {
            qq: string | 'all';
        };
    }

    export interface ReplyMessage extends Message {
        type: 'reply';
        data: {
            id: string;
        };
    }

    // 联合类型 - 所有可能的事件类型
    type OneBot11Event =
        | PrivateMessageEvent
        | GroupMessageEvent
        | GroupUploadNoticeEvent
        | GroupAdminNoticeEvent
        | GroupDecreaseNoticeEvent
        | GroupIncreaseNoticeEvent
        | GroupBanNoticeEvent
        | FriendAddNoticeEvent
        | GroupRecallNoticeEvent
        | FriendRecallNoticeEvent
        | NotifyNoticeEvent
        | PokeNotifyEvent
        | LuckyKingNotifyEvent
        | HonorNotifyEvent
        | FriendRequestEvent
        | GroupRequestEvent
        | LifecycleMetaEvent
        | HeartbeatMetaEvent;

    // 消息事件联合类型
    type MessageEvent = PrivateMessageEvent | GroupMessageEvent;

    // 通知事件联合类型
    type NoticeEvent =
        | GroupUploadNoticeEvent
        | GroupAdminNoticeEvent
        | GroupDecreaseNoticeEvent
        | GroupIncreaseNoticeEvent
        | GroupBanNoticeEvent
        | FriendAddNoticeEvent
        | GroupRecallNoticeEvent
        | FriendRecallNoticeEvent
        | NotifyNoticeEvent
        | PokeNotifyEvent
        | LuckyKingNotifyEvent
        | HonorNotifyEvent;

    // 请求事件联合类型
    type RequestEvent = FriendRequestEvent | GroupRequestEvent;

    // 元事件联合类型
    type MetaEvent = LifecycleMetaEvent | HeartbeatMetaEvent;

    // 类型守卫函数 - 修正后的版本
    export function isMessageEvent(event: OneBot11Event): event is MessageEvent;
    export function isPrivateMessageEvent(event: OneBot11Event): event is PrivateMessageEvent;
    export function isGroupMessageEvent(event: OneBot11Event): event is GroupMessageEvent;
    export function isNoticeEvent(event: OneBot11Event): event is NoticeEvent;
    export function isRequestEvent(event: OneBot11Event): event is RequestEvent;
    export function isMetaEvent(event: OneBot11Event): event is MetaEvent;

    // API 响应类型
    export interface ApiResponse<T = any> {
        status: string;
        retcode: number;
        data: T;
        message?: string;
        echo?: string;
    }

    // 发送消息的响应
    export interface SendMessageResponse {
        message_id: number;
    }

    // 群信息
    export interface GroupInfo {
        group_id: number;
        group_name: string;
        member_count: number;
        max_member_count: number;
    }

    // 群成员信息
    export interface GroupMemberInfo {
        group_id: number;
        user_id: number;
        nickname: string;
        card: string;
        sex: 'male' | 'female' | 'unknown';
        age: number;
        area: string;
        join_time: number;
        last_sent_time: number;
        level: string;
        role: 'owner' | 'admin' | 'member';
        unfriendly: boolean;
        title: string;
        title_expire_time: number;
        card_changeable: boolean;
    }

    // 好友信息
    export interface FriendInfo {
        user_id: number;
        nickname: string;
        remark: string;
    }

    // 消息段类型
    type MessageSegment =
        | TextMessage
        | ImageMessage
        | FaceMessage
        | AtMessage
        | ReplyMessage
        | Message;

    // API 方法类型
    export interface OneBotApi {
        send_private_msg(user_id: number, message: MessageSegment[] | string, auto_escape?: boolean): Promise<ApiResponse<SendMessageResponse>>;
        send_group_msg(group_id: number, message: MessageSegment[] | string, auto_escape?: boolean): Promise<ApiResponse<SendMessageResponse>>;
        delete_msg(message_id: number): Promise<ApiResponse>;
        get_msg(message_id: number): Promise<ApiResponse>;
        get_forward_msg(message_id: number): Promise<ApiResponse>;
        send_like(user_id: number, times?: number): Promise<ApiResponse>;
        set_group_kick(group_id: number, user_id: number, reject_add_request?: boolean): Promise<ApiResponse>;
        set_group_ban(group_id: number, user_id: number, duration?: number): Promise<ApiResponse>;
        set_group_anonymous_ban(group_id: number, anonymous: Anonymous, flag: string, duration?: number): Promise<ApiResponse>;
        set_group_whole_ban(group_id: number, enable?: boolean): Promise<ApiResponse>;
        set_group_admin(group_id: number, user_id: number, enable?: boolean): Promise<ApiResponse>;
        set_group_anonymous(group_id: number, enable?: boolean): Promise<ApiResponse>;
        set_group_card(group_id: number, user_id: number, card?: string): Promise<ApiResponse>;
        set_group_name(group_id: number, group_name: string): Promise<ApiResponse>;
        set_group_leave(group_id: number, is_dismiss?: boolean): Promise<ApiResponse>;
        set_group_special_title(group_id: number, user_id: number, special_title?: string, duration?: number): Promise<ApiResponse>;
        set_friend_add_request(flag: string, approve?: boolean, remark?: string): Promise<ApiResponse>;
        set_group_add_request(flag: string, sub_type: 'add' | 'invite', approve?: boolean, reason?: string): Promise<ApiResponse>;
        get_login_info(): Promise<ApiResponse<{ user_id: number; nickname: string }>>;
        get_stranger_info(user_id: number, no_cache?: boolean): Promise<ApiResponse>;
        get_friend_list(): Promise<ApiResponse<FriendInfo[]>>;
        get_group_info(group_id: number, no_cache?: boolean): Promise<ApiResponse<GroupInfo>>;
        get_group_list(): Promise<ApiResponse<GroupInfo[]>>;
        get_group_member_info(group_id: number, user_id: number, no_cache?: boolean): Promise<ApiResponse<GroupMemberInfo>>;
        get_group_member_list(group_id: number): Promise<ApiResponse<GroupMemberInfo[]>>;
        get_group_honor_info(group_id: number, type: string): Promise<ApiResponse>;
        get_cookies(domain?: string): Promise<ApiResponse<{ cookies: string }>>;
        get_csrf_token(): Promise<ApiResponse<{ token: number }>>;
        get_credentials(domain?: string): Promise<ApiResponse>;
        get_record(file: string, out_format: string): Promise<ApiResponse>;
        get_image(file: string): Promise<ApiResponse>;
        can_send_image(): Promise<ApiResponse<{ yes: boolean }>>;
        can_send_record(): Promise<ApiResponse<{ yes: boolean }>>;
        get_status(): Promise<ApiResponse>;
        get_version_info(): Promise<ApiResponse>;
        set_restart(delay?: number): Promise<ApiResponse>;
        clean_cache(): Promise<ApiResponse>;
    }
}