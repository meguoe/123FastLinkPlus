#import <AppKit/AppKit.h>

static NSString *const magnetScheme = @"magnet";

static int fail(NSString *message, NSURL *logURL) {
  fprintf(stderr, "%s\n", message.UTF8String);
  NSAlert *alert = [[NSAlert alloc] init];
  alert.messageText = @"光鸭云助手启动失败";
  alert.informativeText = logURL ? [NSString stringWithFormat:@"%@\n\n日志：%@", message, logURL.path] : message;
  [alert addButtonWithTitle:@"确定"];
  [alert runModal];
  return 1;
}

static void stopApplication(void) {
  [NSApp stop:nil];
  [NSApp postEvent:[NSEvent otherEventWithType:NSEventTypeApplicationDefined location:NSZeroPoint modifierFlags:0 timestamp:0 windowNumber:0 context:nil subtype:0 data1:0 data2:0] atStart:YES];
}

// 系统磁力事件交给启动脚本直接打开云添加；等待期间继续收集后续事件。
@interface MagnetReceiver : NSObject <NSApplicationDelegate>
@property (nonatomic, strong) NSMutableArray<NSString *> *links;
@property (nonatomic) BOOL processing;
@end

@implementation MagnetReceiver
- (void)application:(NSApplication *)application openURLs:(NSArray<NSURL *> *)urls {
  for (NSURL *url in urls) {
    if ([url.scheme caseInsensitiveCompare:magnetScheme] == NSOrderedSame && url.absoluteString.length) [self.links addObject:url.absoluteString];
  }
  if (self.links.count && !self.processing) stopApplication();
}
@end

// 让本应用接管 magnet:// 默认处理程序，替代单独的 MagnetHandler.app；已是本应用时不再写入系统设置。
// 设置接口对未注册的 bundle 会报成功却不生效，因此以回读结果为准。
static NSString *ensureMagnetHandler(void) {
  NSBundle *self = NSBundle.mainBundle;
  if (!self.bundleIdentifier) return @"跳过：应用缺少 Bundle 标识";
  NSWorkspace *workspace = NSWorkspace.sharedWorkspace;
  NSURL *probe = [NSURL URLWithString:@"magnet:?xt=urn:btih:0"];
  NSString *registered = [workspace URLForApplicationToOpenURL:probe].path;
  if (registered) {
    NSBundle *bundle = [NSBundle bundleWithURL:[NSURL fileURLWithPath:registered]];
    if ([bundle.bundleIdentifier isEqualToString:self.bundleIdentifier] || [registered isEqualToString:self.bundleURL.path]) {
      return [NSString stringWithFormat:@"磁力链接默认处理程序已是本应用：%@", registered];
    }
  }
  dispatch_semaphore_t finished = dispatch_semaphore_create(0);
  __block NSError *failure = nil;
  [workspace setDefaultApplicationAtURL:self.bundleURL toOpenURLsWithScheme:magnetScheme completionHandler:^(NSError *error) {
    failure = error;
    dispatch_semaphore_signal(finished);
  }];
  long waited = dispatch_semaphore_wait(finished, DISPATCH_TIME_NOW);
  NSDate *deadline = [NSDate dateWithTimeIntervalSinceNow:2];
  while (waited != 0 && deadline.timeIntervalSinceNow > 0) {
    [NSRunLoop.currentRunLoop runMode:NSDefaultRunLoopMode beforeDate:[NSDate dateWithTimeIntervalSinceNow:0.05]];
    usleep(5000);
    waited = dispatch_semaphore_wait(finished, DISPATCH_TIME_NOW);
  }
  if (waited != 0) return @"未能设置磁力链接默认处理程序：等待系统响应超时";
  if (failure) return [@"未能设置磁力链接默认处理程序：" stringByAppendingString:failure.localizedDescription];
  NSString *after = [workspace URLForApplicationToOpenURL:probe].path;
  if (after && ![after isEqualToString:registered]) return [NSString stringWithFormat:@"已将磁力链接默认处理程序设为本应用：%@", after];
  return [NSString stringWithFormat:@"未能接管磁力链接默认处理程序，系统未接受设置（当前仍为 %@）；请将光鸭云助手.app 安装到 /Applications 后再启动。", registered ?: @"无"];
}

int main(void) {
  @autoreleasepool {
    NSApplication *application = [NSApplication sharedApplication];
    [application setActivationPolicy:NSApplicationActivationPolicyAccessory];
    MagnetReceiver *receiver = [MagnetReceiver new];
    receiver.links = [NSMutableArray array];
    application.delegate = receiver;
    // 磁力链接启动时系统在本轮事件循环内投递 openURLs:；等不到链接就继续正常注入。
    NSTimer *initialWait = [NSTimer scheduledTimerWithTimeInterval:0.6 repeats:NO block:^(NSTimer *timer) {
      (void)timer;
      stopApplication();
    }];
    [application run];
    [initialWait invalidate];
    receiver.processing = YES;
    NSFileManager *files = NSFileManager.defaultManager;
    NSURL *resources = NSBundle.mainBundle.resourceURL;
    NSURL *node = [resources URLByAppendingPathComponent:@"node"];
    NSURL *script = [resources URLByAppendingPathComponent:@"scripts/open-guangya-devtools.mjs"];
    if (![files isExecutableFileAtPath:node.path] || ![files fileExistsAtPath:script.path]) {
      return fail(@"应用资源缺失，请重新打包或重新复制光鸭云助手.app。", nil);
    }
    NSString *magnetStatus = receiver.links.count ? @"由系统磁力链接唤起" : ensureMagnetHandler();
    if (![files isExecutableFileAtPath:@"/Applications/光鸭云盘.app/Contents/MacOS/光鸭云盘"]) {
      return fail(@"请先将光鸭云盘官方应用安装到 /Applications/光鸭云盘.app。", nil);
    }
    NSURL *library = [files URLsForDirectory:NSLibraryDirectory inDomains:NSUserDomainMask].firstObject;
    NSURL *logDirectory = [library URLByAppendingPathComponent:@"Logs/GuangyaAssistant" isDirectory:YES];
    NSURL *logURL = [logDirectory URLByAppendingPathComponent:@"launcher.log"];
    NSError *error;
    if (![files createDirectoryAtURL:logDirectory withIntermediateDirectories:YES attributes:nil error:&error]) {
      return fail([@"无法创建启动日志：" stringByAppendingString:error.localizedDescription], nil);
    }
    if (![files fileExistsAtPath:logURL.path] && ![files createFileAtPath:logURL.path contents:nil attributes:@{NSFilePosixPermissions: @0600}]) {
      return fail(@"无法创建启动日志文件。", logURL);
    }
    NSFileHandle *log = [NSFileHandle fileHandleForWritingToURL:logURL error:&error];
    if (!log) return fail(error.localizedDescription, logURL);
    [log seekToEndOfFile];
    [log writeData:[[NSString stringWithFormat:@"\n[%@] 光鸭云助手启动\n磁力链接处理程序：%@\n", NSDate.date, magnetStatus] dataUsingEncoding:NSUTF8StringEncoding]];
    do {
      unsigned long long start = log.offsetInFile;
      NSTask *task = [[NSTask alloc] init];
      task.executableURL = node;
      NSMutableArray<NSString *> *arguments = [NSMutableArray arrayWithObject:script.path];
      if (receiver.links.count) {
        [arguments addObject:@"--magnet"];
        [arguments addObjectsFromArray:receiver.links];
        [receiver.links removeAllObjects];
      }
      task.arguments = arguments;
      task.currentDirectoryURL = [resources URLByAppendingPathComponent:@"scripts" isDirectory:YES];
      NSMutableDictionary *environment = NSProcessInfo.processInfo.environment.mutableCopy;
      [environment removeObjectsForKeys:@[@"NODE_OPTIONS", @"NODE_PATH", @"NODE_EXTRA_CA_CERTS"]];
      task.environment = environment;
      task.standardOutput = log;
      task.standardError = log;
      task.terminationHandler = ^(NSTask *finished) {
        (void)finished;
        dispatch_async(dispatch_get_main_queue(), ^{ stopApplication(); });
      };
      if (![task launchAndReturnError:&error]) {
        [log closeFile];
        return fail([@"无法运行内置 Node：" stringByAppendingString:error.localizedDescription], logURL);
      }
      // waitUntilExit 会阻塞 URL 事件投递；保持 AppKit 事件循环，后续链接下一批处理。
      while (task.running) [application run];
      if (task.terminationStatus != 0) {
        [log closeFile];
        NSString *reason = @"启动或注入未完成，请查看日志。";
        NSFileHandle *reader = [NSFileHandle fileHandleForReadingFromURL:logURL error:nil];
        [reader seekToFileOffset:start];
        NSString *output = [[NSString alloc] initWithData:[reader readDataToEndOfFile] encoding:NSUTF8StringEncoding];
        [reader closeFile];
        for (NSString *line in [output componentsSeparatedByString:@"\n"]) {
          NSRange marker = [line rangeOfString:@"Error: "];
          if (marker.location != NSNotFound) { reason = [line substringFromIndex:NSMaxRange(marker)]; break; }
        }
        return fail(reason, logURL);
      }
    } while (receiver.links.count);
    [log closeFile];
    return 0;
  }
}
